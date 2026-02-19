# ROADMAP.md : Project ABYCE

**Version:** 1.0.0
**Cible:** Mobile Webview (60 FPS Constant)
**Moteur:** Custom TypeScript ECS / WebGL 2.0

---

## 🛑 CONSTITUTION TECHNIQUE (RÈGLES ABSOLUES)

Tout code produit dans ce projet doit respecter ces dogmes. Aucune exception ne sera tolérée lors des revues de code.

### 1. Architecture : Data-Oriented Design (ECS)
*   **Pattern :** Entity Component System basé sur des **Sparse Sets**.
*   **Entités :** Simples entiers (`EntityID`). Pas d'objets.
*   **Composants :** Stockés exclusivement dans des **TypedArrays** (`Float32Array`, `Int32Array`, `Uint8Array`).
*   **Systèmes :** Fonctions pures itérant sur les tableaux de composants.
*   **INTERDICTION :** Héritage de classes (`class Player extends Entity`), Programmation Orientée Objet pour les entités de jeu.

### 2. Gestion Mémoire : Politique "Zero-Allocation"
*   **Objectif :** Éliminer le Garbage Collection (GC) durant la boucle de jeu (`update` / `render`).
*   **Moyen :** Utilisation systématique de l'**Object Pooling** pour toutes les entités dynamiques.
*   **INTERDICTION :** Utilisation de `new` dans la boucle principale.
*   **INTERDICTION :** Méthodes fonctionnelles (`.map`, `.filter`, `.forEach`) dans les "Hot Paths". Utiliser des boucles `for` impératives.

### 3. Physique & Rendu
*   **Physique :** Intégration de **Verlet** (Soft Body) pour la phase cellulaire. Pas de moteur physique externe lourd (Matter.js, etc.).
*   **Rendu :** **WebGL 2.0** avec **Instanced Rendering** (Batching). Pas de manipulation du DOM pour le jeu.
*   **UI :** React autorisé uniquement pour l'Overlay (Menus, HUD).

---

## 📅 PHASES DE DÉVELOPPEMENT

### PHASE 1 : SETUP & CORE ENGINE (La Fondation)

**Objectif :** Mettre en place l'infrastructure ECS et la boucle de jeu sans allocation.

*   **1.1 Environnement :**
    *   Initialisation Vite + TypeScript (`strict: true`).
    *   Configuration ESLint pour interdire `any` et restreindre les allocations (règles `no-new`, `no-array-constructor` dans les boucles).

*   **1.2 Architecture ECS (Sparse Set) :**
    *   Implémentation de `ComponentManager` avec :
        *   **Tableaux Denses** (`Float32Array` etc.) : Stockent les données contiguës pour l'itération cache-friendly.
        *   **Tableaux Clairsemés** (`Int32Array`) : Mappent l'ID de l'entité vers l'index dans le tableau dense.
    *   Implémentation de `EntityManager` (Gestion des IDs recyclables via une stack LIFO `Int32Array`).

*   **1.3 Game Loop :**
    *   Boucle `requestAnimationFrame` avec **Fixed Timestep** (accumulateur de temps) pour garantir une physique déterministe indépendante du framerate.

*   **Structures de Données Clés :**
    *   `entityPool`: `Int32Array` (Stack LIFO d'IDs).
    *   `components`: Maps de `TypedArrays` (ex: `pos_x`, `pos_y` séparés ou entrelacés selon profilage).

### PHASE 2 : CELLULAR PHYSICS & RENDERING (Le Prototype)

**Objectif :** Obtenir une cellule "molle" qui se déplace de manière organique à 60 FPS.

*   **2.1 Système Physique (Verlet) :**
    *   `VerletSystem` : Intégration de position (`pos = 2*pos - old_pos + acc*dt*dt`).
    *   Résolution des contraintes de distance (Membranes) par relaxation (itérations multiples / sub-stepping).
    *   **Composants :**
        *   `Position`: `Float32Array` (x, y)
        *   `VerletPoint`: `Float32Array` (old_x, old_y, radius, friction)
        *   `Constraint`: `Int32Array` (entityA_id, entityB_id) + `Float32Array` (restingDistance, stiffness)

*   **2.2 Pipeline de Rendu (WebGL 2.0) :**
    *   `RenderSystem` : Initialisation du contexte WebGL2.
    *   Implémentation d'un **Batch Renderer** : Un seul gros VBO (`Float32Array`) rempli dynamiquement à chaque frame avec les données des entités visibles.
    *   Shaders de base (Cercle avec anti-aliasing procédural dans le fragment shader).

*   **2.3 Input System :**
    *   Virtual Joystick (Touch Events) mappé sur des vecteurs de force appliqués aux points de la membrane.

### PHASE 3 : SPORE-LIKE SYSTEMS (La Simulation)

**Objectif :** Rendre le jeu jouable avec des centaines d'entités (Consommation & Croissance).

*   **3.1 Optimisation Spatiale (CRITIQUE) :**
    *   Implémentation de **`SpatialHashGrid`**.
    *   **Structure :** Tableau 1D plat (`Int32Array`) pour les buckets (cellules de la grille), liste chaînée simulée via tableaux statiques (Linked List in Array) pour gérer les collisions sans allocation dynamique.
    *   Complexité visée : `O(1)` à `O(K)` pour les requêtes de proximité.

*   **3.2 Système de Consommation :**
    *   Détection de collision optimisée (Cercle vs Cercle via Spatial Hash).
    *   Logique de croissance (Scaling des rayons et masses dans les `TypedArrays`).

*   **3.3 Système d'Assemblage (Parts) :**
    *   Logique d'attachement de "Parts" (Flagelles, Bouches, Piques) aux entités.
    *   Chaque "Part" est une entité liée à l'entité parent (via un composant `ParentID`).
    *   Recalcul dynamique des stats (Vitesse, Dégâts) basé sur la composition (System dedicated).

### PHASE 4 : POLISH, UI & INTEGRATION (L'Expérience)

**Objectif :** Transformer le prototype en jeu complet et intégrer l'interface.

*   **4.1 UI Overlay (React) :**
    *   Couche React au-dessus du Canvas pour le HUD et l'Éditeur de Créature.
    *   Communication unidirectionnelle (Game State -> UI) via événements optimisés ou lecture directe de buffers partagés (si nécessaire).

*   **4.2 Shaders Avancés (Bio-Cartoon) :**
    *   Implémentation de **SDF (Signed Distance Fields)** ou Metaballs dans le Fragment Shader pour la fusion visuelle des membranes.
    *   Effet "Cel-Shading" et contours (Post-processing léger ou in-shader).

*   **4.3 Mobile Bridge :**
    *   Création de l'interface `NativeBridge`.
    *   Gestion des appels `window.Android.showAd()` avec mise en pause sécurisée de la `GameLoop`.

### PHASE 5 : EVOLUTION & PERSISTENCE (La Finalisation)

**Objectif :** Sauvegarde, Audio et Boucle de Gameplay complète.

*   **5.1 Génétique & Sauvegarde :**
    *   Sérialisation des composants ECS en binaire ou chaîne Base64 compacte (pas de JSON verbeux pour les données massives).
    *   Algorithme de mutation génétique agissant directement sur les `Float32Array` des créatures (modification aléatoire des attributs).

*   **5.2 Audio Procédural :**
    *   Moteur audio **WebAudio API** (Oscillateurs + Gain Nodes).
    *   Synthèse sonore basée sur la taille et la vitesse des entités (pas d'assets lourds).

*   **5.3 Profiling Final :**
    *   Audit mémoire (Chrome Profiler) pour confirmer le Zero-Allocation.
    *   Ajustement des tailles de Pools et des paramètres du Spatial Hash.

---
**Validation Architecte :** [JULES]
**Statut :** PRÊT POUR PHASE 1.
