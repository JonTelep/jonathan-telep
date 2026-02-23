// Filesystem state
export const currentPath = ['content'];
export const filesystem = {
    content: {
        type: 'directory',
        contents: {
            'README.md': {
                type: 'file',
                url: 'https://jonathantelep.com',
                github: 'https://github.com/JonTelep/jonathan-telep',
                content: `# Hello! I am Jonathan Telep.

I am a senior software engineer at Red Hat that likes to build things that I needed or always wanted and created this site to share my projects and thoughts. Much of my random personal projects will be public on [github](https://github.com/JonTelep).

Slowly but surely I am building [Telep IO LLC](https://telep.io/), a software company building SaaS solutions for a better future. Follow me in [Twitter/X](https://x.com/telep_io) to keep informed on what this may entail.

If you are looking to work together on any project that is exciting, please feel free to reach me via a DM on twitter. I am always looking to get involved in interesting projects.

## Socials:
- [Twitter/X](https://x.com/telep_io)
- [LinkedIn](https://www.linkedin.com/in/jonathan-telep-576750115)
- [Github](https://github.com/JonTelep) 

## Current Projects:
- The website you are reading this on ([jonathantelep.com](https://jonathantelep.com))
- [Visualize Postgres](https://jonathantelep.com/postgres); A PostgreSQL CREATE SQL to ER Diagram web application.
- [JSONIFY](https://jonathantelep.com/json); A JSON parser that can parse JSON files and return the data in a readable format.
- [Let's Talk Statistics](https://letstalkstatistics.com); An interactive data visualization platform designed to make statistical concepts accessible and engaging for students, researchers, and data enthusiasts.
`
            },
            'projects': {
                type: 'directory',
                contents: {
                    'visualize-postgres.md': {
                        type: 'file',
                        url: 'https://jonathantelep.com/postgres',
                        github: 'https://github.com/JonTelep/visualize-postgres',
                        content: `# Visualize Postgres

A web application that converts PostgreSQL CREATE SQL statements into Entity-Relationship (ER) Diagrams. This tool helps developers and database administrators visualize their database schema by parsing SQL CREATE TABLE statements and generating interactive ER diagrams.

## Features

- Parse PostgreSQL CREATE TABLE statements
- Generate interactive ER diagrams
- Visualize table relationships and foreign keys
- Modern web-based interface

## Source Code

The source code is available on GitHub: [https://github.com/JonTelep/visualize-postgres](https://github.com/JonTelep/visualize-postgres)

## Tech Stack

- Frontend: React with Vite
- Backend: Python with FastAPI
- Diagram Rendering: Custom visualization engine`
                    },
                    'json.md': {
                        type: 'file',
                        url: 'https://jonathantelep.com/json',
                        github: 'https://github.com/JonTelep/jsonify',
                        content: `# JSON Parser

A JSON parser that can parse JSON files and return the data in a readable format.`
                    },
                    'lets-talk-statistics.md': {
                        type: 'file',
                        url: 'https://letstalkstatistics.com',
                        github: 'https://github.com/JonTelep/lets-talk-statistics',
                        content: `# Let's Talk Statistics

An interactive data visualization platform designed to make statistical concepts accessible and engaging for students, researchers, and data enthusiasts.

## About

Let's Talk Statistics provides real-time, interactive charts and visualizations that help users explore and understand statistical concepts through hands-on experimentation. The platform combines educational content with practical tools for data analysis.

## Key Features

- **Interactive Visualizations**: Real-time charts that respond to user input
- **Educational Content**: Comprehensive guides to statistical concepts
- **Data Analysis Tools**: Built-in calculators and analysis functions
- **Responsive Design**: Works seamlessly across desktop and mobile devices
- **Open Source**: Full source code available for learning and contribution

## Technologies Used

- **Frontend**: Next.js with React
- **Backend**: FastAPI with Python
- **Data Visualization**: D3.js and Chart.js
- **Statistics Engine**: NumPy and SciPy
- **Database**: PostgreSQL

## Mission

To bridge the gap between theoretical statistics and practical application by providing accessible, interactive tools for learning and exploring data science concepts.

Visit the live application at [letstalkstatistics.com](https://letstalkstatistics.com)`
                    },
                    'telep-io.md': {
                        type: 'file',
                        url: 'https://telep.io',
                        github: 'https://github.com/TalepIO',
                        content: `# Telep IO LLC

A software development company focused on building innovative SaaS solutions that solve real-world problems and create value for users and businesses.

## Company Vision

To build software that makes a meaningful difference in people's lives, focusing on quality, user experience, and sustainable business practices.

## Core Values

- **Innovation**: Embracing new technologies and creative solutions
- **Quality**: Delivering robust, well-tested, maintainable software
- **Transparency**: Open development practices and clear communication
- **Sustainability**: Building for long-term value, not short-term gains
- **User-Centric**: Every decision considers the end-user experience

## Current Projects

### Let's Talk Statistics
Educational platform for interactive statistical learning and data visualization.

### Capitol Trades
Government transparency tool tracking congressional financial disclosures.

### Visualize Postgres
Database visualization tool for PostgreSQL schema management.

## Services Offered

- **Custom Software Development**: Full-stack web and mobile applications
- **SaaS Product Development**: From concept to launch and scaling
- **Database Design & Optimization**: PostgreSQL, MongoDB, Redis expertise
- **API Development**: RESTful and GraphQL API design and implementation
- **DevOps & Infrastructure**: Docker, Kubernetes, cloud deployment strategies

## Technology Expertise

- **Languages**: Python, JavaScript/TypeScript, Go, Rust
- **Frameworks**: FastAPI, Next.js, React, Vue.js
- **Databases**: PostgreSQL, MongoDB, Redis, ClickHouse
- **Cloud**: AWS, Google Cloud, DigitalOcean
- **Tools**: Docker, Kubernetes, GitHub Actions, Terraform

## Get in Touch

Interested in working together? Let's discuss your project.

- **Website**: [telep.io](https://telep.io)
- **Twitter**: [@telep_io](https://x.com/telep_io)
- **Email**: jon@telep.io

Ready to build something amazing? Let's talk.`
                    }
                }
            }
        }
    }
};

export function getDirectoryContents(path) {
    let current = filesystem;
    for (const dir of path) {
        current = current[dir].contents;
    }
    return current;
} 