
# DUERP Config Bundle v3.0.0

- **45+ NAF**, **120+ UT**, **70+ risques**, **80+ actions**, **30+ obligations**, **400+ couples activité↔risque**.
- Contrat respecté : migrations idempotentes, upserts JSON, `_config_version` (semver + SHA-256).

## Utilisation
```bash
unzip -o config_bundle_v3.0.0.zip -d .
npm install
CONFIG_VERSION=3.0.0 npm run config:apply
# Optionnel (non prod) :
npm run config:apply:reset
```
