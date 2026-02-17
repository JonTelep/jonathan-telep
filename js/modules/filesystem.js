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
- [Visualize Postgres](https://jonathantelep.com/postgres-visualizer/); A PostgreSQL CREATE SQL to ER Diagram web application.
- [Business by Telegram](https://github.com/JonTelep/telegram); A service connecting a telegram channel to your database.
`
            },
            'projects': {
                type: 'directory',
                contents: {
                    'visualize-postgres.md': {
                        type: 'file',
                        url: 'https://jonathantelep.com/postgres-visualizer/',
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
                    'capitol-trades.md': {
                        type: 'file',
                        url: 'https://capitoltrades.com',
                        github: 'https://github.com/JonTelep/capitol-trades',
                        content: `# Capitol Trades

A transparency platform that tracks and analyzes stock trades made by members of Congress, providing public access to elected officials' financial activities.

## Mission Statement

Capitol Trades promotes government transparency by making congressional financial disclosures easily accessible and searchable. We believe the public has a right to know about potential conflicts of interest among their elected representatives.

## Features

- **Real-time Trade Tracking**: Monitor congressional stock trades as they're disclosed
- **Advanced Search & Filtering**: Find trades by representative, stock, date range, and more
- **Market Analysis**: Analyze trading patterns and performance metrics
- **Data Visualization**: Interactive charts showing trading trends and insights
- **Mobile Responsive**: Full functionality on all devices
- **API Access**: Programmatic access to trade data for researchers and journalists

## How It Works

1. **Data Collection**: Automated parsing of official congressional disclosure forms
2. **Data Validation**: Cross-reference with multiple sources for accuracy
3. **Real-time Updates**: New trades appear within hours of official filing
4. **Public Access**: Free, unrestricted access to all data and visualizations

## Technology Stack

- **Backend**: Python with FastAPI
- **Database**: PostgreSQL with time-series optimizations
- **Frontend**: React with TypeScript
- **Data Processing**: Pandas and NumPy
- **Visualization**: D3.js and Recharts
- **Infrastructure**: Docker containerization

## Legal & Ethics

All data is sourced from publicly available government disclosures. Capitol Trades operates in full compliance with transparency laws and ethical journalism standards.

Explore the platform at [capitoltrades.com](https://capitoltrades.com)`
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
- **Email**: hello@telep.io

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