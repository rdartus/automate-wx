# Automate-Wuxiaworld

## Dev Container
The container reads environment variables from the process that launches VS Code, not from the shell inside the container.

Recommended options on Linux:

1. Start VS Code from a terminal where the variables are exported.
2. Or put them in a host-level env file, for example `~/.config/environment.d/automate-wx.conf`.

Example:
```ini
SITE_URL=https://example.com
USER_WX=xxx
PASSWORD_WX=xxx
```

After changing the variables, run `Dev Containers: Rebuild and Reopen in Container`.

If you prefer a repo-local file, create `.devcontainer/devcontainer.env` and keep it untracked.

## create / bindmount list.json
``` json
{
    "site" : "urltosite",
    "books" : [
        "url to book",
        "url to book"
    ]
}
```

## Build it with Bake
```
docker buildx bake
```
