const ABOUT_SECTIONS = [
  {
    title: 'What This Experience Focuses On',
    body:
      'The goal is simple: help visitors move through modern and contemporary art in a way that feels welcoming, visual, and easy to navigate. The collection pages surface high-level browsing, while the detailed views provide context for the works and the artists behind them.',
  },
  {
    title: 'Why The Structure Matters',
    body:
      'Pairing artists with related artworks creates a more connected flow. Instead of seeing isolated records, visitors can follow relationships across mediums, time periods, and individual creators without losing the feeling of a curated path.',
  },
  {
    title: 'Personal Features',
    body:
      'Authentication and account features create a more personal experience. With sign-in support in place, the app is ready to tie saved likes and other preferences directly to a user profile rather than leaving them as temporary session-only actions.',
  },
  {
    title: 'Where It Goes Next',
    body:
      'The foundation now supports richer collection storytelling, stronger recommendation flows, and deeper personalization. As the project grows, those pieces can extend the museum feel without losing the clear, modern interface that keeps browsing approachable.',
  },
]

// Explain the purpose and direction of the MoMA collection experience.
function AboutPage() {
  return (
    <section className="about-page">
      <div className="about-hero">
        <p className="home-section-kicker about-kicker">About MoMA</p>
        <h1 className="page-title about-title">A museum experience shaped for the web.</h1>
      </div>

      <div className="about-sections">
        {ABOUT_SECTIONS.map((section, index) => (
          <section
            key={section.title}
            className={`about-section-row ${
              index % 2 === 1 ? 'about-section-row-right' : 'about-section-row-left'
            }`}
          >
            <div className="about-section-content">
              <h2 className="modal-section-title about-section-title">{section.title}</h2>
              <p className="modal-bio about-body-text">{section.body}</p>
            </div>
          </section>
        ))}
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
