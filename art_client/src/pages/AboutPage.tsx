// Explain the purpose and direction of the MoMA collection experience.
function AboutPage() {
  return (
    <section className="about-page">
      <div className="about-hero">
        <p className="home-section-kicker">About MoMA</p>
        <h1 className="page-title about-title">A museum experience shaped for the web.</h1>
        <p className="page-subtitle about-subtitle">
          This space is designed to make the collection easier to explore, with
          room to move from broad discovery into richer artist and artwork detail.
        </p>
      </div>

      <div className="about-grid">
        <section className="modal-section">
          <h2 className="modal-section-title">What This Experience Focuses On</h2>
          <p className="modal-bio about-body-text">
            The goal is simple: help visitors move through modern and contemporary
            art in a way that feels welcoming, visual, and easy to navigate. The
            collection pages surface high-level browsing, while the detailed views
            provide context for the works and the artists behind them.
          </p>
        </section>

        <section className="modal-section">
          <h2 className="modal-section-title">Why The Structure Matters</h2>
          <p className="modal-bio about-body-text">
            Pairing artists with related artworks creates a more connected flow.
            Instead of seeing isolated records, visitors can follow relationships
            across mediums, time periods, and individual creators without losing
            the feeling of a curated path.
          </p>
        </section>

        <section className="modal-section">
          <h2 className="modal-section-title">Personal Features</h2>
          <p className="modal-bio about-body-text">
            Authentication and account features create a more personal experience.
            With sign-in support in place, the app is ready to tie saved likes and
            other preferences directly to a user profile rather than leaving them
            as temporary session-only actions.
          </p>
        </section>

        <section className="modal-section">
          <h2 className="modal-section-title">Where It Goes Next</h2>
          <p className="modal-bio about-body-text">
            The foundation now supports richer collection storytelling, stronger
            recommendation flows, and deeper personalization. As the project grows,
            those pieces can extend the museum feel without losing the clear,
            modern interface that keeps browsing approachable.
          </p>
        </section>
      </div>

      <div className="about-actions">
        <a href="#/home" className="show-more-btn home-section-btn">
          Back Home
        </a>
        <a href="#/artwork" className="show-more-btn home-section-btn">
          Explore Artwork
        </a>
      </div>
    </section>
  )
}

export default AboutPage
