# CineGear 3D — WebAssembly Follow Focus 0.8 MOD Studio

Generatore parametrico 3D al 100% nel browser per ghiere follow focus e diaframma (standard cinema 0.8 MOD) per obiettivi vintage e moderni.

## Caratteristiche
- **100% Client-Side:** Basato su **Manifold3D (WebAssembly)** e **Three.js**. Nessun server o Python richiesto.
- **Calcolo Istantaneo in 40 ms:** Modelli 3D 100% manifold/watertight generati in una frazione di secondo direttamente dalla CPU/GPU del browser.
- **Profili di Montaggio:** Lobi vintage (Mir-1B), Micro-zigrinato (Helios 44-2), Liscio cilindrico con battuta.
- **Incisione Curva Frontale:** Scavo del testo personalizzato lungo la curvatura della lente.
- **Standard Cinematografici a Tendina:** Diametri standard (80mm, 85mm, 90mm, 95mm, 114mm), spessori parete calcolati, altezze e smussi standard.
- **Esportazione Diretta:** Scarica l'STL binario pronto per Bambu Studio o qualsiasi slicer.

## Pubblicazione su GitHub Pages

1. Crea una nuova repository pubblica su GitHub chiamata `cinegear-3d`.
2. Nella cartella locale, esegui:
   ```bash
   git init
   git add .
   git commit -m "Initial commit CineGear 3D WebAssembly"
   git branch -M main
   git remote add origin https://github.com/<TUO-USERNAME>/cinegear-3d.git
   git push -u origin main
   ```
3. Su GitHub, vai in **Settings** -> **Pages** -> sotto **Build and deployment** seleziona **Branch: main** e cartella **/ (root)**, poi clicca **Save**.
4. Il tuo generatore sarà online all'indirizzo:
   `https://<TUO-USERNAME>.github.io/cinegear-3d/`
