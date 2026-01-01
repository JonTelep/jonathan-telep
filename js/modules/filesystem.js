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