## Auto Authentication (`/auto_auth`)

This page provides a mechanism to automatically authenticate a user or, if the user doesn't exist, automatically register and then authenticate them based on query parameters provided in the URL.

### Workflow

1.  **Parameter Extraction**: The page retrieves the following query parameters from the URL:
    *   `firstname`
    *   `lastname`
    *   `email`
    *   `uid`
    *   `guard`
2.  **Initial Login Attempt**: It attempts to log the user in using the `credentials` provider with the provided `email` and `uid` (used as the password).
3.  **User Registration (if login fails)**: If the initial login attempt fails (indicated by an error in the `signIn` result), the page assumes the user does not exist. It then sends a POST request to the `/api/auth/register` endpoint to create a new user account with the details extracted from the query parameters (`firstname`, `lastname`, `email`, `uid` as password). The `role` is set to `ADMIN` if `guard` is "admin", otherwise it defaults to `USER`.
4.  **Final Login Attempt**: After a successful registration (or if the initial login was successful), it attempts to log the user in again using the same `email` and `uid`.
5.  **Redirection**:
    *   On successful login (either initial or after registration), the user is redirected to the `/calendar` page.
    *   If any critical step fails (missing `email` or `uid`, user registration fails, final login fails), the user is redirected to the `/error` page.
6.  **Loading State**: A loading spinner is displayed while the authentication process is in progress.

### Query Parameters

*   `firstname` (string, required for registration): The user's first name.
*   `lastname` (string, required for registration): The user's last name.
*   `email` (string, required): The user's email address. Used for both login and registration.
*   `uid` (string, required): A unique identifier for the user, which is used as their password for the `credentials` provider.
*   `guard` (string, optional): Determines the user's role upon registration. If set to `"admin"`, the user gets the `ADMIN` role. Otherwise, they get the `USER` role.

### Example URL

```
localhost:3000/auto_auth?firstname=John&lastname=Doe&email=john.doe@example.com&uid=user123&guard=admin
```

This URL would attempt to log in `john.doe@example.com` with the password `user123`. If that fails, it would register a new user with the name "John Doe", email `john.doe@example.com`, password `user123`, and the `USER` role, and then log them in.
