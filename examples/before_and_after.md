# ASD-STE100 Before and After Examples

Real-world comparisons between conventional verbose technical writing, 100% Strict ASD-STE100, and Andrej Karpathy's 80% Pragmatic Mode.

---

## Example 1: Database Replication & Failover

### Original (Verbose & Ambiguous)
> In order to properly maintain high availability across the distributed database cluster, it is highly recommended that replicas be continuously monitored by health check daemons, and in the event that a primary node failure is detected, an automatic failover procedure should be initiated subsequent to the termination of all pending write transactions.

- **Issues:** 46 words (far exceeds 25-word limit), passive voice ("be continuously monitored", "is detected", "be initiated"), unapproved words (*in order to*, *properly*, *in the event that*, *should*, *subsequent to*, *termination*).

### 100% Strict ASD-STE100
> Health check daemons must monitor database replicas continuously.  
> If the primary node fails, stop all pending write transactions.  
> Then start the automatic failover procedure.

- **Metrics:** 3 sentences, 8–10 words each. Active voice. Imperative verbs. Zero unapproved vocabulary.

### 80% Pragmatic Mode (Karpathy Style)
> Health check daemons monitor all database replicas continuously.  
> When a primary node fails, the cluster stops pending write transactions.  
> Then the system triggers automatic failover to promote a healthy replica.

---

## Example 2: API Rate Limiting & Auth Tokens

### Original (Verbose)
> Prior to transmitting requests to the authenticated endpoints, developers should ascertain that an adequate bearer token has been obtained and appended to the authorization header, as well as ensure that the request rate does not exceed the prescribed threshold.

- **Issues:** 38 words, passive voice ("has been obtained and appended"), unapproved words (*prior to*, *transmitting*, *should*, *ascertain*, *adequate*, *as well as*, *prescribed*).

### 100% Strict ASD-STE100
> Get a valid bearer token before you send requests to protected endpoints.  
> Add the token to the authorization header.  
> Do not send more requests than the specified limit.

### 80% Pragmatic Mode (Karpathy Style)
> Get a valid bearer token before calling protected API endpoints.  
> Attach the bearer token to your HTTP Authorization header.  
> Keep your request rate below the specified per-minute limit to avoid HTTP 429 errors.

---

## Example 3: Docker Container Build & Cache Management

### Original (Verbose)
> It should be noted that in order to facilitate optimal Docker build performance, multi-stage builds ought to be utilized so that intermediate dependencies are eliminated from the final container image, thereby reducing attack surface and image magnitude.

### 100% Strict ASD-STE100
> Use multi-stage builds to get the best Docker performance.  
> Remove build dependencies from the final container image.  
> This step reduces image size and improves security.

### 80% Pragmatic Mode (Karpathy Style)
> Use multi-stage Docker builds to optimize build speed and image size.  
> Multi-stage builds keep intermediate dependencies out of the final container image.  
> This practice shrinks image size and reduces attack surface.
