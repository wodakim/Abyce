# **ROADMAP MONUMENTAL : PROJET ABYCE**

**Version:** 1.0.0
**Cible:** Mobile Webview (iOS/Android) via `webintoapp.com`
**Moteur:** Custom TypeScript ECS / WebGL 2.0 (Zero-Allocation)
**Modèle:** Free-to-Play (Online Only, Ad-Supported)

## **1. VISION & ARCHITECTURE GLOBALE**

### **1.1 Concept Fondamental**
Un "God Game" évolutif inspiré de *Spore* (Phase Cellulaire & Aquatique), optimisé pour une fluidité absolue (60 FPS) sur mobile.
*   **Microbien :** Physique Soft-Body (Verlet), Zoom sémantique, Survie.
*   **Aquatique :** Physique Rigide (Box2D-lite), 2.5D Parallaxe, Exploration.
*   **Éditeur :** Création procédurale de créatures (Parts & DNA).

### **1.2 Architecture Technique (Strict Zero-Allocation)**
*   **Langage :** TypeScript (Strict Mode).
*   **ECS (Entity Component System) :**
    *   **World :** Gestionnaire central des entités.
    *   **Components :** `Float32Array` contigus (SoA - Structure of Arrays). Pas d'objets JS.
    *   **Systems :** Logique pure itérant sur les composants.
*   **Moteur de Rendu :** WebGL 2.0 Natif (Batch Rendering).
    *   Pas de `PIXI.js` ou `Three.js` complet (trop lourd). Micro-librairie custom.
    *   Shaders : Cel-Shading, SDF (Metaballs), Distortion (Eau).
*   **UI Overlay :** React (découplé du canvas de jeu via EventBus).
*   **Sécurité & Online :**
    *   **Online-Only Enforcement :** Le jeu refuse de démarrer ou se met en pause si `navigator.onLine` est false.
    *   **Anti-Cheat :** Validation serveur légère (Cloud Function) des scores/DNA (Phase future). Obfuscation du code client.

---

## **2. EXPÉRIENCE UTILISATEUR (UX) & INTERFACE (UI)**

### **2.1 Flux de Navigation (Menus)**
*   **Écran de Splash (Preloader) :**
    *   Logo ABYCE.
    *   Barre de chargement (Assets & Connexion).
    *   *Check Connexion :* Si offline -> Popup bloquante "Connexion Requise".
*   **Menu Principal (L'Arbre de Vie) :**
    *   **Visuel :** Hélice ADN 3D tournante (WebGL).
    *   **Bouton "Nouvelle Vie" :** Lance la panspermie.
    *   **Bouton "Galerie" :** Swipe horizontal des créatures créées.
    *   **Bouton "Paramètres" (Roue dentée) :**
        *   *Son :* Musique / FX (Sliders).
        *   *Graphismes :* Qualité (Basse/Haute), FPS (30/60).
        *   *Langue :* FR/EN.
        *   *Compte :* ID Joueur, Restaurer Achats.
*   **L'Éditeur de Créature :**
    *   **Vue :** Créature au centre.
    *   **Bas :** Carrousel de "Parts" (Bouches, Yeux, Flagelles).
    *   **Haut :** Statistiques (Vitesse, Attaque, Santé) mises à jour en temps réel.
    *   **Action :** Drag & Drop tactile.

### **2.2 HUD (In-Game)**
*   **Minimaliste & Diegetic :**
    *   **Santé :** Pas de barre. La créature devient pâle/desaturée quand elle est blessée.
    *   **Faim/ADN :** Jauge circulaire discrète autour du joystick ou dans un coin.
    *   **Joystick Virtuel :** Flottant (apparaît au toucher).
    *   **Bouton "Cri" (Social) :** Pour trouver des partenaires ou effrayer.

### **2.3 Direction Artistique (DA)**
*   **Style :** "Bio-Cartoon".
    *   Couleurs saturées, contours nets (Shader Outline).
    *   Effet "Squishy" (Déformation vertex shader).
*   **Ambiance :**
    *   *Microbien :* Fond flou, particules en suspension, aberration chromatique légère.
    *   *Aquatique :* Profondeur (Brouillard bleu), Rayons de lumière (Godrays).

---

## **3. GAMEPLAY LOOP & SYSTÈMES**

### **3.1 Boucle Microbienne (The Soup)**
1.  **Spawn :** Météorite -> Éclosion.
2.  **Survie :** Éviter les plus gros, manger les plus petits/plancton.
3.  **Collecte :** Fragments d'ADN (Monnaie d'évolution).
4.  **Appel Amoureux :** Une fois la jauge pleine -> Mini-jeu de rythme pour séduire.
5.  **Éditeur :** Dépenser l'ADN pour ajouter des pièces.
6.  **Respawn :** Nouvelle génération avec les modifications.

### **3.2 Boucle Aquatique (The Abyss)**
1.  **Transition :** La créature grossit et le monde change d'échelle (Zoom out).
2.  **Exploration 2.5D :** Navigation gauche/droite + Profondeur (Layers).
3.  **Niches Écologiques :** Chasser en surface (rapide, dangereux) ou fouiller le fond (lent, riche).
4.  **Social :** Former un banc (Schooling behavior).

### **3.3 Endgame & Monétisation**
*   **Endgame :**
    *   Atteindre le stade "Sentient" (Tribal - Teasing).
    *   Compléter le "Codex" (Toutes les pièces, toutes les proies rares).
    *   Mode "Survie Infinie" (Leaderboard mondial).
*   **Monétisation (Ad-Supported) :**
    *   **Bannière :** Discrète dans les menus (pas en jeu).
    *   **Rewarded Video (Pay-to-Fast) :**
        *   *Respawn Rapide :* Garder 50% de la masse après la mort.
        *   *Double ADN :* X2 gains pendant 5 minutes.
        *   *Mutation Rare :* Débloquer une pièce "Or" dans l'éditeur.

---

## **4. SÉCURITÉ & INFRASTRUCTURE**

### **4.1 Online-Only Enforcement**
*   **Connectivity Check :**
    *   `window.addEventListener('offline', ...)` : Pause immédiate du jeu + Overlay noir "Connexion Perdue".
    *   Ping régulier vers un endpoint léger (ex: Google ou API custom) pour vérifier la *vraie* connectivité (pas juste le WiFi).
*   **Anti-Triche (Basic) :**
    *   Validation des timestamps : Empêcher le speedhack grossier.
    *   Sanity Check des données de sauvegarde (pas de stats infinies).

### **4.2 Compilation & Déploiement**
*   **Webview Wrapper :**
    *   Projet optimisé pour `webintoapp.com`.
    *   Manifeste PWA complet (`manifest.json`) pour icones/splash.
    *   Gestion du `viewport` mobile (pas de zoom, pas de scroll élastique).

---

## **5. ROADMAP D'EXÉCUTION (PHASAGE)**

### **PHASE 1 : FONDATIONS (Squelette Technique)**
- [ ] Initialisation Projet (Vite + TS Strict + ESLint).
- [ ] Mise en place de l'Architecture ECS (World, Entity, Component).
- [ ] Création du `GameLoop` (Fixed Timestep 60Hz).
- [ ] Système de Rendu WebGL 2.0 (Contexte, Shaders base).
- [ ] Système de Sécurité "Online-Only" (Overlay bloquant).

### **PHASE 2 : MOTEUR PHYSIQUE & CELLULAIRE**
- [ ] Implémentation Physique Verlet (Points, Constraints).
- [ ] Rendu "Metaballs" (SDF Shader).
- [ ] Contrôles Tactiles (Joystick Virtuel).
- [ ] Gameplay de base : Manger, Grandir.

### **PHASE 3 : ÉDITEUR DE CRÉATURE (Cœur du Jeu)**
- [ ] UI React pour l'Éditeur.
- [ ] Système de "Parts" (Logique d'attachement ECS).
- [ ] Sérialisation ADN (Save/Load).
- [ ] Intégration dans la boucle de jeu (Mort -> Éditeur -> Respawn).

### **PHASE 4 : CONTENU & POLISH**
- [ ] Ajout des Ennemis (IA Boids).
- [ ] Génération Procédurale (Biomes, Plancton).
- [ ] Audio (WebAudio API procédural).
- [ ] Shaders finaux (Couleurs, Effets).

### **PHASE 5 : MONÉTISATION & DÉPLOIEMENT**
- [ ] Intégration `NativeBridge` pour les Pubs (Mockup Web -> Appel Natif).
- [ ] Système de Bannière & Rewarded Ads.
- [ ] Préparation du Build (Minification, Assets).
- [ ] Test final sur Mobile (Performance Audit).

---

**Ce document est la LOI du projet. Toute déviation doit être justifiée.**
