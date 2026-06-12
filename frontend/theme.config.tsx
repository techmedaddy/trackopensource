import React from 'react';

const config = {
  logo: <span>TrackOpenSource Engineering</span>,
  project: {
    link: 'https://github.com/techmedaddy/trackopensource',
  },
  docsRepositoryBase: 'https://github.com/techmedaddy/trackopensource/tree/main/docs',
  useNextSeoProps() {
    return {
      titleTemplate: '%s – TrackOpenSource'
    }
  },
  sidebar: {
    defaultMenuCollapseLevel: 1,
    toggleButton: true,
  },
  darkMode: true,
  primaryHue: 210, // Gives a nice blue tint
  footer: {
    text: 'TrackOpenSource Engineering Documentation',
  },
  search: {
    placeholder: 'Search documentation...',
  }
};

export default config;
