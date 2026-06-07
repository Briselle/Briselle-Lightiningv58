import { Link } from 'react-router-dom';
import { BRISHELLE_MODULES } from './zivaKnowledge.js';
import './ZivaPage.css';

/**
 * Standalone Ziva / assistant outline. Merge `pageConfig` for assets and CTA targets.
 */
export default function ZivaPage({ pageConfig }) {
  const logo = pageConfig?.assets?.logo ?? '/assets/briselle-logo.svg';
  const homePath = pageConfig?.homePath ?? '/dashboard';

  return (
    <>
      <section className="ziva-page-hero">
        <div className="ziva-module-container">
          <div className="ziva-hero-content">
            <h1 className="ziva-hero-title">Ziva</h1>
            <p className="ziva-hero-subtitle">Briselle platform assistant</p>
            <p className="ziva-hero-desc">
              Ziva helps you work with <strong>Objects</strong>, <strong>Records</strong>, and the rest of the Briselle
              shell—navigation, field suggestions for new data models, and quick links into the areas you use every day.
              Use the chat widget at the bottom right while you build.
            </p>
            <div className="ziva-hero-cta">
              <span className="ziva-hero-cta-hint">Open the Ziva panel from any screen in the app.</span>
              <Link to={homePath} className="ziva-btn-primary">
                Back to app
              </Link>
            </div>
          </div>
          <div className="ziva-hero-visual" aria-hidden="true">
            <div className="ziva-hero-icon">
              <img src={logo} alt="" className="ziva-hero-logo" />
            </div>
          </div>
        </div>
      </section>

      <section className="ziva-page-content-block">
        <div className="ziva-module-container">
          <h2>What Ziva covers</h2>
          <p className="ziva-page-lead">Same modules as the tag bar in chat—expanded over time</p>
          <div className="ziva-features-grid">
            <div className="ziva-feature-card">
              <i className="fas fa-database" />
              <h3>Objects & fields</h3>
              <p>
                Create, load, and edit objects; jump to field design; get starter field lists (for example Top 10 / Top
                15) for domains like Health Claims.
              </p>
            </div>
            <div className="ziva-feature-card">
              <i className="fas fa-table" />
              <h3>Records</h3>
              <p>Browse objects to open their record lists and understand how row data hangs off each object.</p>
            </div>
            <div className="ziva-feature-card">
              <i className="fas fa-wand-magic-sparkles" />
              <h3>Guided next steps</h3>
              <p>
                Suggested prompts and in-app links (Dashboard, Settings, Users, Templates) so you spend less time
                hunting routes.
              </p>
            </div>
            <div className="ziva-feature-card">
              <i className="fas fa-plug" />
              <h3>Ready for automation</h3>
              <p>
                Today Ziva answers and routes locally; connect your API later to create metadata or records from natural
                language.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="ziva-page-section ziva-roles-section">
        <div className="ziva-module-container">
          <h2 className="ziva-section-title">Modules in the Ziva tag bar</h2>
          <p className="ziva-section-subtitle">Pick one in chat to drill down or jump into the app.</p>
          <ul className="ziva-roles-list">
            {BRISHELLE_MODULES.map((m) => (
              <li key={m.id} className="ziva-role-card">
                <i className={`fas ${m.icon}`} />
                <span>{m.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="ziva-page-section ziva-cta-section">
        <div className="ziva-module-container">
          <h2>Try Ziva in the app</h2>
          <p>
            Examples: &ldquo;I want an object for health claims&rdquo; → use <strong>Top 10 field ideas</strong> or{' '}
            <strong>Top 15 field ideas</strong>. Or choose <strong>Objects</strong> → <strong>Create New Object</strong>{' '}
            from the tags.
          </p>
        </div>
      </section>
    </>
  );
}
