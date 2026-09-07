# jsonify

A minimal, private JSON beautifier with collapsible tree view. Runs entirely in the browser — no data ever leaves your machine.

Live at [jonathantelep.com/json](https://jonathantelep.com/json)

## Run locally

```bash
podman build -t jsonify .
podman run -d -p 3006:3006 --name jsonify jsonify
```

Then open [localhost:3006](http://localhost:3006).

## Stop

```bash
podman stop jsonify && podman rm jsonify
```
