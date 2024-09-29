// WHEN GENERATING SESSION IDS
// - name the session id something generic like "id"
// - use a strong CSPRNG (Cryptographically Secure Pseudorandom Number Generator) to generate ids
//   with a size of at least 128 bits and ensure that each sessionID is unique
// - ids should be 16 hexadecimal characters long
// - use temporary cookies that are deleted upon browser closing
// - tell the browser not to cache the cookie

// WHEN ACCESSING PROTECTED RESOURCES
// - check if incoming session ids are in a valid form
//
// - when user visits with expired or missing session cookie
//   - check for a rememeber me token
//   - if no remember me token, set their cookie to be empty and set it's max age to be in the past and return unauthorized
//   - if the remember me token is present but in an invalid form log suspicious activity
//   - if the remember me token is present and it's series id does not match the associated token in the db, lock the user out
//   - if the remember me token is present but it is expired
//       - delete the associated session series from the db
//       - return unauthorized
//   - if the remember me token is valid and not expired
//       - log the user in and grant access to the protected resource
//         if their role is sufficient to access it, else return unauthorized
//       - regenerate and overwrite the remember me token but keep the series id with expiration

// WHEN CHANGING PASSWORD
// - regenerate session id on password changes and role changes, and delete any old ones for that user
//
// - have an idle and absolute timeout for session length

// - upon login create a "remember me" cookie which the client is allowed to keep
//   (set max age long time) and is associated with their ip and "device fingerprints"(?)
// - the token should include a "token" and "series id" and be saved associated with the user
// - hash the "remember me" token when storing it
// - when users log in with the "remember me" token, refresh it and overwrite the old one but keep
//   the series id
// - expire the series id after a long time
// - logging out should invalidate the "remember me" token
