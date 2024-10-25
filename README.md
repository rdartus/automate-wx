# Automate-Wuxiaworld

## Dev Container
Add the env vars to the devcontainer
Add the env vars to the docker compose file
```
export USER_WX="xxx"
export PASSWORD_WX="xxx"

nano ~/.bashrc
```

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
docker buildx install
docker build bake
```
