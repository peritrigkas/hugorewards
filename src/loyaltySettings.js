import { clientConfig } from "./client.config";

// Read once at import time — safe only because this module is reached through
// App.jsx, which main.jsx imports after the tenant's config has been resolved.
export const STAMPS_FOR_REWARD = clientConfig.loyalty.stampsForReward;
