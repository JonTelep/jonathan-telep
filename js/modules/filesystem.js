// Filesystem state
export const currentPath = ['content'];
export const filesystem = {
    content: {
        type: 'directory',
        contents: {
            'README.md': { 
                type: 'file',
                content: `# Hello! I am Jonathan Telep.

I am a senior software engineer trying to escape the 9-5.I have lost my passion for engineering working on boring data sets at my employers and am now working to rejuvenate my passion. No more increasing shareholder value, but more increasing my independent value with hopes of being my own boss. This journey began by starting to be very active on X as [@telep_io](https://x.com/telep_io) where I (will) post my projects and interact with my interests including shitposting. 

My main goal is to try to build a following of like-minded people to interact with. As we can all benefit from each other's work as well as profit from eachothers engagement thanks to X's monetization share. 

You will find some of my projects are silly and just were built from an idea that popped into my head. Some will be more serious SaaS applications that I use myself. Just build and ship is what I've learned thus far and am going to abide by that lifestyle moving forward.

## Current Projects:
- The website you are reading this on; A website to share my projects and thoughts.
- MinesSwept; A social experiment created on a single page app of a giant minesweeper game where everyone works together to solve the minesweeper board.
## Future Projects:
- LetsTalkStatistics; My personal collection of statistics I've found interesting. Around Finance, Economics, Politics

## Interests:
- Crypto
- AI
- Buzzword here
- Politics
- Buzzword there
- Home lab haver
- LLM Trainer
- Video game player
- 3d Printer`
            },
            'projects': {
                type: 'directory',
                contents: {
                    'letstalkstatistics.md': { 
                        type: 'file',
                        content: `# Let's Talk Statistics (To be shipped Q2 2025)

This is a project that is under development. It is a website that will display a wide range of statistics and why they are important; around Crypto, Finance, Economics, Politics, etc.

The [site](https://letstalkstatistics.com) is not available at the moment but it will be when available.`
                    },
                    'mineswept.md': {
                        type: 'file',
                        content: `# Mineswept (To be shipped soon)

[Mines Swept](https://mineswept.com) is a social experience that I am working on. It is a simple mine-sweeper game on a single page wishing to be completed by various users. The game mine-sweeper is a game that I alwasy go back to generally on a flights and love the simplicty yet the complexity that it can have. Simple math to find the bombs as well as pure luck sometimes.

Mines Swept will be a single page application that will allow N number of users to join via webhooks and try to complete the game. The one that fails will be publicly shamed on an active leaderboard. `
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