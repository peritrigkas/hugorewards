import { cleanup } from "./support.js";

export default () => cleanup(process.env.SMOKE_RUN_STARTED_AT);
