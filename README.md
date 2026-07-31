# Automate-Wuxiaworld

## Dev Container
### Opencode

```shell
# Crée le dossier temporaire dans votre configuration de conteneur
mkdir -p /d/Code/automate-wx/.devcontainer/tmp

# Copie votre vrai fichier d'authentification à cet endroit
cp ~/.local/share/opencode/auth.json /d/Code/automate-wx/.devcontainer/tmp/auth.json
```

### Other
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

## Commands

Install dependencies:
```bash
npm install
```

Build the TypeScript project:
```bash
npm run build
```

Run the automation script:
```bash
npm start
```

Run in watch mode during development:
```bash
npm run dev
```

Install Playwright browsers if needed:
```bash
npx playwright install
```
