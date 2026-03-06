/**
 * Third-party widget configuration
 * Controls which widgets load and on which routes they should be excluded
 */

export const WIDGET_CONFIG = {
  // Routes where widgets should NOT load (auth pages with forms)
  excludedRoutes: ['/signin', '/signup', '/forgot-password'],

  webchat: {
    enabled: true,
    widgetId: '59f2ede3-bc12-11f0-b2ef-5a30acca1c57',
    src: 'https://cdn.apigateway.co/webchat-client..prod/sdk.js',
  },

  audioeye: {
    enabled: true,
    siteHash: '381dc796c4bc43ced9c959b0c8b720ce',
  },
};

/**
 * Determines if widgets should load based on the current pathname
 */
export function shouldLoadWidgets(pathname: string): boolean {
  return !WIDGET_CONFIG.excludedRoutes.includes(pathname);
}
