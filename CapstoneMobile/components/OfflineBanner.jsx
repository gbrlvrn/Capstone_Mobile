/**
 * OfflineBanner.jsx
 *
 * The application-wide offline banner is centrally managed and rendered
 * by NetworkProvider in NetworkContext.jsx (at root App level).
 * This component remains as a harmless pass-through so existing screen
 * imports and JSX elements work seamlessly without duplicate banner rendering
 * or uncoordinated polling intervals.
 */
import React from "react";

function OfflineBanner() {
  return null;
}

export default React.memo(OfflineBanner);

