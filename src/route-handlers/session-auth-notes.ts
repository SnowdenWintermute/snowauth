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
//
// WHEN LOGGING OUT
// - logging out should invalidate the "remember me" token
//
//
// OAUTH NOTES:
//
// client secret makes it so only our server can exchange authorization codes for id tokens
//
// state makes it so only the browser which started the oauth request can successfully present
// an authorization code
//
// an attacker can start an oauth flow and get a legit state linked to their own browser, and then
// use a stolen authorization code in their request to our server
//
// our server will then exchange the authorization code for the victim's token and check if the nonce
// inside the id_token matches the nonce in the presenting browser's cookie (which it won't)
// we will check for an identical nonce in our database and delete it if it exists. this means
// that if the nonce is stolen, its usefulness would be short lived since it can't be used
// once the intended user has used it
