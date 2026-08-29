using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;

namespace Briselle_Lightining.Server.Controllers;

/// <summary>
/// Optional in-process Ziva API (same routes as ziva-chat-module standalone server).
/// For plug-and-play, prefer the module's Node server on ZIVA_PORT and set VITE_ZIVA_API_URL in the client.
/// </summary>
[ApiController]
[Route("api/ziva")]
public class ZivaController : ControllerBase
{
    private const string GroqUrl = "https://api.groq.com/openai/v1/chat/completions";
    private const string DefaultModel = "llama-3.1-8b-instant";

    private static readonly string[] AllowedTypes =
    {
        "Text", "Number", "Date", "DateTime", "Currency", "Percent", "Checkbox",
        "Picklist", "TextArea", "TextAreaLong", "Email", "Phone", "Url",
    };

    private readonly IConfiguration _configuration;
    private readonly IHttpClientFactory _httpClientFactory;

    public ZivaController(IConfiguration configuration, IHttpClientFactory httpClientFactory)
    {
        _configuration = configuration;
        _httpClientFactory = httpClientFactory;
    }

    [HttpPost("object-fields")]
    public async Task<IActionResult> ObjectFields([FromBody] ObjectFieldsRequest body, CancellationToken cancellationToken)
    {
        var topic = (body.Topic ?? "").Trim();
        var objectLabel = (body.ObjectLabel ?? "").Trim();
        var count = Math.Clamp(body.Count <= 0 ? 10 : body.Count, 1, 60);

        if (string.IsNullOrEmpty(topic) && string.IsNullOrEmpty(objectLabel))
        {
            return BadRequest(new { error = "Topic or object label is required." });
        }

        var apiKey = Environment.GetEnvironmentVariable("GROQ_API_KEY")
            ?? _configuration["Groq:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            return StatusCode(501, new { error = "AI not configured", fallback = true });
        }

        var model = _configuration["Groq:Model"] ?? DefaultModel;
        var systemPrompt = BuildObjectFieldsSystemPrompt();
        var userPrompt = $"Topic: {topic}\nObject name: {objectLabel}\nNumber of fields: {count}";

        try
        {
            var client = _httpClientFactory.CreateClient();
            var payload = new
            {
                model,
                messages = new[]
                {
                    new { role = "system", content = systemPrompt },
                    new { role = "user", content = userPrompt },
                },
                max_tokens = 2048,
                temperature = 0.35,
                response_format = new { type = "json_object" },
            };

            using var request = new HttpRequestMessage(HttpMethod.Post, GroqUrl);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
            request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

            using var response = await client.SendAsync(request, cancellationToken);
            var raw = await response.Content.ReadAsStringAsync(cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return StatusCode(502, new { error = "AI temporarily unavailable", fallback = true });
            }

            using var doc = JsonDocument.Parse(raw);
            var content = doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString();

            if (string.IsNullOrWhiteSpace(content))
            {
                return StatusCode(502, new { error = "Empty AI response", fallback = true });
            }

            var parsed = ParseObjectFieldsJson(content, count);
            if (parsed.Fields.Count == 0)
            {
                return StatusCode(502, new { error = "Could not parse field list", fallback = true });
            }

            return Ok(new
            {
                fields = parsed.Fields,
                presetLabel = parsed.PresetLabel,
                source = "groq",
            });
        }
        catch (Exception)
        {
            return StatusCode(502, new { error = "AI temporarily unavailable", fallback = true });
        }
    }

    private static string BuildObjectFieldsSystemPrompt()
    {
        var types = string.Join(", ", AllowedTypes);
        return "You design custom object fields for the Briselle data platform. "
            + "The user describes their domain in plain language. Propose fields that fit THAT domain only.\n\n"
            + "Return ONLY a JSON object (no markdown):\n"
            + "{\"presetLabel\":\"short human label for this domain\",\"fields\":[\"Label (Type)\", ...]}\n\n"
            + "Rules:\n"
            + $"- Each field must be \"Label (Type)\" with Type exactly one of: {types}\n"
            + "- Match the user's topic; do not add unrelated finance/health/CRM columns unless the topic requires them\n"
            + "- No duplicate labels; exactly the requested count when possible\n"
            + "- Use clear business labels (not API names)";
    }

    private static (List<string> Fields, string PresetLabel) ParseObjectFieldsJson(string content, int count)
    {
        var jsonText = content.Trim();
        var fence = Regex.Match(jsonText, @"```(?:json)?\s*([\s\S]*?)```", RegexOptions.IgnoreCase);
        if (fence.Success) jsonText = fence.Groups[1].Value.Trim();

        using var doc = JsonDocument.Parse(jsonText);
        var root = doc.RootElement;
        var presetLabel = root.TryGetProperty("presetLabel", out var pl)
            ? (pl.GetString() ?? "Custom object").Trim()
            : "Custom object";

        var fields = new List<string>();
        if (root.TryGetProperty("fields", out var arr) && arr.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in arr.EnumerateArray())
            {
                var line = FieldItemToSpecLine(item);
                if (!string.IsNullOrEmpty(line)) fields.Add(line);
            }
        }

        return (fields.Take(count).ToList(), presetLabel);
    }

    private static string FieldItemToSpecLine(JsonElement item)
    {
        if (item.ValueKind == JsonValueKind.String)
            return NormalizeFieldSpecLine(item.GetString() ?? "");
        if (item.ValueKind == JsonValueKind.Object)
        {
            var label = "";
            if (item.TryGetProperty("label", out var l)) label = l.GetString() ?? "";
            else if (item.TryGetProperty("name", out var n)) label = n.GetString() ?? "";
            var type = "Text";
            if (item.TryGetProperty("type", out var t)) type = t.GetString() ?? "Text";
            else if (item.TryGetProperty("dataType", out var dt)) type = dt.GetString() ?? "Text";
            if (!string.IsNullOrWhiteSpace(label))
                return NormalizeFieldSpecLine($"{label.Trim()} ({type.Trim()})");
        }
        return "";
    }

    private static string NormalizeFieldSpecLine(string line)
    {
        var t = line.Trim();
        if (string.IsNullOrEmpty(t)) return "";
        var m = Regex.Match(t, @"^(.+?)\s*\(([^)]+)\)\s*$");
        if (!m.Success) return $"{t} (Text)";
        var label = m.Groups[1].Value.Trim();
        var typeRaw = m.Groups[2].Value.Trim();
        var type = AllowedTypes.FirstOrDefault(
            x => x.Equals(typeRaw, StringComparison.OrdinalIgnoreCase)) ?? "Text";
        return $"{label} ({type})";
    }

    public sealed class ObjectFieldsRequest
    {
        [JsonPropertyName("topic")]
        public string? Topic { get; set; }

        [JsonPropertyName("objectLabel")]
        public string? ObjectLabel { get; set; }

        [JsonPropertyName("count")]
        public int Count { get; set; }
    }
}
