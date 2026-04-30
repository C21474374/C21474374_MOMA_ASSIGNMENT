import dataFlowDiagram from '../assets/data_flow_diagram_moma.png'

type AboutSection = {
  title: string
  paragraphs: string[]
  points?: string[]
}

const ABOUT_SECTIONS: AboutSection[] = [
  {
    title: 'How The Application Works',
    paragraphs: [
      'The application is split into a React frontend and an Express backend connected to MongoDB. Visitors can browse artwork and artist collections, open record details, and move between related artists and artworks without leaving the main experience.',
      'When the frontend needs data, it calls REST endpoints on the backend. The backend reads from MongoDB collections, returns JSON responses, and handles create, update, and delete operations for artists and artwork. For signed-in users, likes are stored on the user profile and used to generate simple artwork recommendations based on shared metadata such as artist, classification, department, and constituent identifiers.',
    ],
  },
  {
    title: 'Technologies Used',
    paragraphs: [
      'The project uses a small full-stack JavaScript setup so the frontend, backend, and database layers stay easy to connect and reason about.',
    ],
    points: [
      'React with TypeScript and Vite for the client-side interface, routing, and interactive collection views.',
      'Node.js with Express for the REST API, request handling, and application server logic.',
      'MongoDB with Mongoose and the native collection access pattern for storing users, artists, and artwork documents.',
      'JWT authentication with bcrypt password hashing for account registration, login, and protected user actions.',
      'Custom CSS and Postman collections for presentation, manual API testing, and development verification.',
    ],
  },
  {
    title: 'Main Limitations',
    paragraphs: [
      'The current implementation works well for a coursework-sized project, but there are a few important trade-offs and weaknesses worth calling out honestly.',
    ],
    points: [
      'The artwork and artist pages currently load large datasets into the browser and then filter them client-side, which is simpler to build but less scalable for very large collections.',
      'CRUD actions are available through the interface without a separate admin role, so the permission model is still basic.',
      'The recommendation logic is content-based and heuristic, which makes it understandable but also limited compared with more advanced recommendation systems.',
    ],
  },
  {
    title: 'Alternative Approaches',
    paragraphs: [
      'There are several other ways this application could have been implemented depending on the project goals, expected scale, and deployment preferences.',
    ],
    points: [
      'A framework such as Next.js or Remix could combine frontend and backend concerns more tightly and support route-based rendering without a separate client dev server.',
      'A relational database such as PostgreSQL could be used instead of MongoDB if the project needed stronger relational modelling, joins, or stricter schemas.',
      'Server-side pagination, search indexing, and filtering could replace client-side filtering to improve performance for larger datasets.',
    ],
  },
]

// Explain the purpose and direction of the MoMA collection experience.
function AboutPage() {
  return (
    <section className="about-page">
      <div className="about-hero">
        <div className="about-hero-copy">
          <h1 className="page-title home-section-title">About This Page</h1>
          <p className="page-subtitle home-section-subtitle about-subtitle">
            This page explains how the application works, the technologies used in the
            project, the main limitations of the current implementation, and some
            alternative approaches that could also have been used.
          </p>
        </div>
      </div>

      <div className="about-sections">
        {ABOUT_SECTIONS.map((section, index) => (
          <section
            key={section.title}
            className={`about-section-row ${
              index === 0 ? 'about-section-row-with-diagram ' : ''
            }${
              index % 2 === 1 ? 'about-section-row-right' : 'about-section-row-left'
            }`}
          >
            <div className="about-section-content">
              <h2 className="modal-section-title about-section-title">{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="modal-bio about-body-text">
                  {paragraph}
                </p>
              ))}
              {section.points && (
                <ul className="about-list">
                  {section.points.map((point) => (
                    <li key={point} className="about-list-item">
                      {point}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {index === 0 && (
              <figure className="about-diagram-panel">
                <img
                  src={dataFlowDiagram}
                  alt="Flow diagram showing the MoMA application frontend, backend, authentication, and MongoDB data flow."
                  className="about-diagram-image"
                />
              </figure>
            )}
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
