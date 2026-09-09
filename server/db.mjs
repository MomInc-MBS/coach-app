export const db=env=>{if(!env.DB)throw Object.assign(new Error('Account storage is not connected yet.'),{status:503});return env.DB;};
