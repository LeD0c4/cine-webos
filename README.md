# Selvania Ciné — appli LG webOS

Appli **Jellyfin** « façon Netflix » pour les télés LG (webOS), installée en **mode développeur** (sans passer par le LG Content Store). Navigation complète à la télécommande. Interface en français.

> **English** — The LG webOS package of [cine-web](https://github.com/LeD0c4/cine-web), a Netflix-style Jellyfin client. It is installed in Developer Mode with LG's `ares` CLI; this guide walks through the setup.

Au premier lancement, l'appli demande l'adresse du serveur Jellyfin, puis l'identifiant et le mot de passe (ou un code Quick Connect) : elle fonctionne avec n'importe quel serveur.

## Construire le paquet

L'appli = l'interface de [`cine-web`](https://github.com/LeD0c4/cine-web) (clonée **à côté** de ce dépôt) + les fichiers propres à webOS du dossier `app/` (`appinfo.json`, icônes, écran de démarrage).

```bash
git clone https://github.com/LeD0c4/cine-web ../cine-web
npm install                       # outils LG (@webos-tools/cli)
npm install --prefix ../cine-web
node build.mjs                    # → dist/fr.selvania.cine_<version>_all.ipk
```

`build.mjs` compile l'interface en version « appli », la copie dans `app/` (sans les attributs qui bloquent l'ouverture depuis les fichiers de la télé), reprend le numéro de version de `cine-web`, puis crée le `.ipk` avec `ares-package`. Un `.ipk` prêt à installer est aussi joint aux **Releases** du dépôt.

Les commandes `ares-*` se lancent avec `npx` depuis ce dossier (elles sont installées par `npm install`).

---

## Étape 1 — Le serveur doit accepter l'appli (une seule fois)

L'appli parle directement au serveur Jellyfin. Jellyfin autorise ces requêtes tout seul ; mais si un reverse proxy ajoute ses propres en-têtes CORS (ou une chaîne de sécurité), il peut bloquer les pré-requêtes : l'appli trouve le serveur mais la connexion échoue.

Avec Traefik, ajoutez ce middleware (fichier `deploy/jellyfin-cors.yml` de `cine-web`) et placez `jellyfin-cors@file` **en tête** des middlewares du routeur Jellyfin :

```yaml
http:
  middlewares:
    jellyfin-cors:
      headers:
        accessControlAllowOriginList: ["*"]
        accessControlAllowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
        accessControlAllowHeaders: ["Authorization", "Content-Type", "X-Emby-Authorization"]
        accessControlMaxAge: 600
```

Le script `deploy/install-vps.sh` de `cine-web` le fait automatiquement. Avec un autre reverse proxy (nginx, Caddy…), laissez passer la méthode `OPTIONS` jusqu'à Jellyfin ou autorisez les en-têtes ci-dessus.

Pour se connecter avec un code plutôt qu'en tapant le mot de passe à la télécommande, activez **Quick Connect** dans Jellyfin (Tableau de bord › Général).

---

## Étape 2 — Mettre la télé en mode développeur

1. Créez un compte gratuit sur <https://webostv.developer.lge.com>.
2. Sur la télé : LG Content Store › cherchez **Developer Mode** › installez.
3. Ouvrez **Developer Mode** et connectez-vous avec le compte LG.
4. Activez **Dev Mode Status** : la télé redémarre.
5. Rouvrez **Developer Mode** et activez **Key Server**.
6. Notez l'**adresse IP** de la télé et la **passphrase** (6 caractères) affichées.

L'ordinateur et la télé doivent être sur le même réseau.

---

## Étape 3 — Installer l'appli depuis l'ordinateur

Remplacez `<IP-DE-LA-TÉLÉ>` par l'adresse notée à l'étape 2.

**3.1 Déclarer la télé** (une seule fois) :

```bash
npx ares-setup-device -a lgtv -i "host=<IP-DE-LA-TÉLÉ>" -i "port=9922" -i "username=prisoner"
```

Si `lgtv` existe déjà (adresse changée) : `npx ares-setup-device -m lgtv -i "host=<IP-DE-LA-TÉLÉ>"`.

**3.2 Récupérer la clé de la télé** (une seule fois ; la commande demande la passphrase) :

```bash
npx ares-novacom --device lgtv --getkey
```

**3.3 Vérifier que l'ordinateur voit la télé :**

```bash
npx ares-device --device lgtv --system-info
```

**3.4 Installer l'appli :**

```bash
npx ares-install --device lgtv dist/fr.selvania.cine_<version>_all.ipk
```

**3.5 La lancer** (ou depuis la liste des applis de la télé) :

```bash
npx ares-launch --device lgtv fr.selvania.cine
```

**Premier lancement :** saisissez l'adresse de votre serveur Jellyfin (`jellyfin.exemple.fr`, `192.168.1.20:8096`…), puis votre compte, ou « Quick Connect » : le code s'affiche sur la télé, validez-le depuis un autre appareil (Jellyfin › Profil › Quick Connect).

---

## Mettre à jour l'appli

Reconstruisez le paquet (ou téléchargez celui de la dernière release) puis réinstallez par-dessus : la connexion au serveur est conservée.

```bash
node build.mjs
npx ares-install --device lgtv dist/fr.selvania.cine_<version>_all.ipk
```

## Le mode développeur expire au bout de 50 h

Sans prolongation, la télé désactive le mode développeur **et supprime l'appli**.

- **À la main :** dans **Developer Mode** sur la télé, appuyez sur **Extend** (remet 50 h).
- **Automatiquement :** une machine toujours allumée du réseau peut prolonger la session chaque jour. Elle lit le jeton de session sur la télé (connexion SSH avec la clé récupérée à l'étape 3.2, port 9922, utilisateur `prisoner`) puis appelle le service de LG ; plusieurs scripts communautaires existent (recherche : « webOS dev mode renew »).

Si l'appli a disparu : réactivez Dev Mode Status (étape 2) puis réinstallez (3.4). Les étapes 3.1 et 3.2 restent valables tant que l'adresse et la passphrase n'ont pas changé.

## Personnaliser

- **Identifiant, nom, version** : `app/appinfo.json` (la version est recopiée depuis `cine-web` à chaque construction).
- **Icônes, bannière, écran de démarrage** : générés depuis le logo par `brand/build-icons.py` dans `cine-web`.

## En cas de souci

| Problème | Solution |
|---|---|
| `ares-novacom --getkey` : connexion refusée | **Key Server** n'est pas activé dans Developer Mode, ou mauvaise adresse. |
| `ares-install` : « Unknown method » ou délai dépassé | Télé en veille ou mode développeur expiré : rouvrez Developer Mode et vérifiez **Dev Mode Status**. |
| Passphrase refusée | Elle change quand on désactive / réactive le mode développeur : relisez-la et refaites 3.2. |
| L'appli trouve le serveur mais la connexion échoue | Pré-requêtes CORS bloquées par le reverse proxy : voir l'étape 1. |
| Écran noir au lancement | Fermez l'appli (Retour longuement) et relancez-la ; sinon `npx ares-inspect --device lgtv --app fr.selvania.cine --open` ouvre la console de débogage. |
| Désinstaller | `npx ares-install --device lgtv --remove fr.selvania.cine` |

## Intégration continue

`.github/workflows/webos.yml` construit le paquet à chaque envoi et *pull request* (en récupérant `cine-web`) et le joint à une release pour une étiquette `v*`. Variable de dépôt facultative `CINE_WEB_REPO` (votre fork de `cine-web`).

## Contribuer

Voir [`CONTRIBUTING.md`](CONTRIBUTING.md). Ce projet est développé en **vibe coding** : le code est écrit en grande partie par une IA (Claude, d'Anthropic) à partir des demandes et des essais de l'auteur — relisez et testez, et signalez ce qui ne va pas.

## Licence

[GNU GPL v3](LICENSE). LG et webOS sont des marques de LG Electronics ; Jellyfin est une marque de son projet. Selvania Ciné n'est affilié à aucun des deux.
