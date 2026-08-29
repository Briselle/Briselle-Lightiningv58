import { useState } from 'react';
import './ZivaContactForm.css';

/**
 * Portable reach-out form (no Supabase). POSTs JSON to `submitUrl` when set.
 * Replace with your own component via ZivaChat `contactFormComponent` prop.
 */
export default function SimpleZivaContactForm({ submitUrl, submitButtonLabel = 'Send' }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const em = email.trim();
    if (!em) {
      setError('Please enter your email.');
      return;
    }
    setError('');
    if (!submitUrl) {
      setError('Contact endpoint is not configured (set config.contactSubmitUrl).');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(submitUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || 'Chat user',
          email: em,
          message: message.trim() || 'Reach-out from ZIVA chat',
          source: 'ziva_chat_reach_out',
        }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        const t = await res.text().catch(() => '');
        setError(t || `Request failed (${res.status}).`);
      }
    } catch (_) {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="ziva-contact-form ziva-contact-done">
        <p>Thanks! We&apos;ve received your details and will get back to you soon.</p>
      </div>
    );
  }

  return (
    <div className="ziva-contact-form">
      <p className="ziva-contact-intro">Want to reach out? Leave your details and we&apos;ll get back to you.</p>
      <form onSubmit={handleSubmit} className="ziva-contact-fields">
        <input
          type="text"
          placeholder="Name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="ziva-contact-input"
          aria-label="Your name"
        />
        <input
          type="email"
          placeholder="Email *"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="ziva-contact-input"
          required
          aria-label="Your email"
        />
        <textarea
          placeholder="Message (optional)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="ziva-contact-input ziva-contact-message"
          rows={2}
          aria-label="Message"
        />
        {error && (
          <p className="ziva-contact-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="ziva-contact-submit" disabled={loading}>
          {loading ? 'Sending...' : submitButtonLabel}
        </button>
      </form>
    </div>
  );
}
