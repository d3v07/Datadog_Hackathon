// Aggregates per-domain handler registration. Called once by install.ts.

import { registerVendorHandlers } from "./vendors.js";
import { registerInboxHandlers } from "./inbox.js";
import { registerChangeHandlers } from "./changes.js";
import { registerRenewalHandlers } from "./renewals.js";
import { registerRequestHandlers } from "./requests.js";
import { registerFindingHandlers } from "./findings.js";
import { registerReportHandlers } from "./reports.js";
import { registerIntegrationHandlers } from "./integrations.js";
import { registerBillingHandlers } from "./billing.js";
import { registerTeamHandlers } from "./team.js";
import { registerMiscHandlers } from "./misc.js";

export function registerAllHandlers(): void {
  registerVendorHandlers();
  registerInboxHandlers();
  registerChangeHandlers();
  registerRenewalHandlers();
  registerRequestHandlers();
  registerFindingHandlers();
  registerReportHandlers();
  registerIntegrationHandlers();
  registerBillingHandlers();
  registerTeamHandlers();
  registerMiscHandlers();
}
