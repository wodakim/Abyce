# **Project: ABYCE (Nom de Code)**

**Version du Document:** 1.0.0

**Cible:** Mobile Webview (iOS WKWebView / Android WebView)

**Moteur:** Custom WebGL 2.0 / ECS Architecture

**Style:** Simulation Évolutive / Arcade / Cartoonesque

## ---

**1\. Vision du Projet & Objectifs**

Créer une expérience de "God Game" évolutive inspirée de *Spore*, optimisée pour les navigateurs mobiles (Webview). Le jeu se concentre sur les phases **Microbienne (Cellulaire)** et **Sous-marine (Aquatique)**.

* **Pilier Technique :** Performance maximale (60 FPS) sur mobile via une architecture ECS (Entity Component System) et l'utilisation de WebGL 2.0.  
* **Pilier Artistique :** Une esthétique "Cartoon Organique" (Vibrant, Squishy, Expressif).  
* **Pilier Business :** Modèle F2P (Free-to-Play) basé sur la rejouabilité infinie (Roguelite) et une monétisation hybride (Ads/Reward).

## ---

**2\. Architecture Technique (Contraintes Strictes)**

### **2.1 Stack Technologique**

* **Langage :** TypeScript (Stricte typage pour la maintenabilité).  
* **Rendu :** WebGL 2.0 natif ou via une librairie légère (ex: Pixi.js pour la 2D, Three.js allégé pour la 2.5D).  
* **Architecture Logique :** Entity Component System (ECS).  
  * *Pourquoi?* Gestion de milliers d'entités (particules, cellules) sans garbage collection excessif.  
  * *Implémentation :* Utilisation de TypedArrays (Float32Array) pour les composants (Position, Vélocité, Santé). Pas d'allocation d'objets dans la boucle de jeu (new Object() interdit dans update()).

### **2.2 Moteurs Physiques (Hybridation)**

Le jeu utilise deux modèles physiques distincts selon la phase :

1. **Phase Microbienne (Verlet Integration) :**  
   * Simulation de corps mous (Soft Body).  
   * Les cellules sont des assemblages de points reliés par des ressorts (constraints).  
   * Sensation : Organique, visqueuse, "flubber".  
2. **Phase Aquatique (Rigid Body / Box2D ou Planck.js) :**  
   * Simulation de corps rigides articulés.  
   * Gestion de la flottabilité (Buoyancy) et de la traînée hydrodynamique (Drag).  
   * Sensation : Poids, inertie, propulsion.

## ---

**3\. Direction Artistique (DA) : "Bio-Cartoon"**

### **3.1 Esthétique Visuelle**

* **Style :** Cartoonesque, inspiré de *Kurzgesagt* ou *LocoRoco*. Contours nets, couleurs saturées, ombrages plats (Cel-shading simplifie).  
* **Couleurs :**  
  * *Background :* Dégradés profonds (Bleu abysse \-\> Cyan surface) avec effets de parallaxe.  
  * *Entités :* Couleurs vives pour le joueur et les dangers. Couleurs pastel pour la nourriture.  
* **Feedback Visuel (Squash & Stretch) :**  
  * Toute collision doit déformer visuellement l'entité.  
  * Les yeux des créatures doivent suivre le mouvement (Lag) et grossir sous l'effort/peur.

### **3.2 Technique de Rendu**

* **Shaders (GLSL) :** Utilisation intensive de SDF (Signed Distance Fields) pour fusionner les formes (Metaballs) en phase microbienne, créant des membranes qui s'étirent et se séparent proprement.  
* **Particules :** bulles, débris, plancton générés via GPU Instancing pour ne pas impacter le CPU.

## ---

**4\. UX & Interface Utilisateur (Menu et Navigation)**

L'interface doit être "Diegetic" (intégrée au monde) et tactile (Thumb-friendly).

### **4.1 Le Menu Principal : "L'Arbre de Vie"**

Au lieu d'une liste de boutons, le menu est une visualisation de l'ADN.

* **Visuel :** Une double hélice d'ADN stylisée qui tourne doucement. Chaque "barreau" de l'échelle représente une sauvegarde ou une espèce créée.  
* **Intéractions :**  
  * *Nouvelle Partie :* Cliquer sur une "graine" cosmique flottant autour de l'ADN.  
  * *Galerie :* Faire glisser l'hélice pour voir les créatures passées (fossiles).  
  * *Settings :* Une cellule "Engrenage" flottante.

### **4.2 L'Éditeur de Créature (Mobile UX)**

* **Drag & Drop :** Les pièces (bouches, nageoires) sont dans un carrousel en bas. Le joueur les glisse sur le corps.  
* **Snapping Magnétique :** Les pièces s'aimantent automatiquement aux points valides (vertèbres).  
* **Symétrie :** Activée par défaut (feedback visuel immédiat de la pièce miroir).  
* **Feedback Tactile :** Légère vibration (Haptic API) lors du placement d'une pièce.

## ---

**5\. Gameloop & Mécaniques**

### **5.1 Macro-Loop (Cycle de Vie)**

1. **Spawn (Panspermie) :** Arrivée sur la planète (choix du biome initial via l'atterrissage).  
2. **Survive & Collect :** Phase d'action. Manger pour gagner des "Points d'ADN" et de la "Masse".  
3. **Mating Call (Appel) :** Une fois la jauge de croissance pleine, trouver un partenaire pour lancer l'éditeur.  
4. **Edit & Evolve :** Dépenser l'ADN pour ajouter des pièces, changer la forme, améliorer les stats.  
5. **Rebirth :** Retour au jeu avec la nouvelle forme.  
6. **Transition :** Après X générations, déclencher l'événement de transition (Cellule \-\> Colonie \-\> Organisme Aquatique).

### **5.2 Phase Microbienne (The Soup)**

* **Objectif :** Grossir.  
* **Gameplay :** 2D Top-down. Contrôle style "joystick virtuel" ou "suivre le doigt".  
* **Mécanique clé :** La viscosité. Le joueur ne "glisse" pas indéfiniment ; il doit nager activement.  
* **Ennemis :** Virus (rapides), Amibes géantes (lentes), Courants marins.

### **5.3 Phase Aquatique (The Abyss)**

* **Objectif :** Dominer l'écosystème local et migrer vers la surface.  
* **Gameplay :** 2.5D (Side-scroller avec profondeur).  
* **Mécanique clé :** Les Couches (Layers).  
  * Le joueur peut aller au "premier plan" ou à "l'arrière-plan" (flou) pour se cacher ou chasser.  
  * Système de *Flottabilité* : Gérer sa vessie natatoire pour monter/descendre sans effort.

## ---

**6\. Simulation & Rejouabilité (Systemic Design)**

### **6.1 Écosystème Procédural (Lotka-Volterra)**

* Le jeu ne *spawne* pas des ennemis au hasard. Il simule des populations.  
* **Règle :** Si le joueur mange trop d'herbivores, les prédateurs meurent de faim (ou attaquent le joueur par désespoir).  
* **Algorithme Génétique :** Les espèces NPC évoluent aussi. Si le joueur est rapide, les prédateurs de la génération suivante auront plus de nageoires (vitesse accrue).

### **6.2 Génération de la Carte (Seed)**

Chaque partie est basée sur une "Seed" (Graine).

* Biome Volcanique, Biome Corallien, Biome Abyssal.  
* Cela change la palette de couleurs, la viscosité du fluide, et les types de nourriture disponibles.

## ---

**7\. Stratégie de Monétisation (Ad-Design)**

L'objectif est de générer du revenu sans briser l'immersion "Flow".

1. **Rewarded Ads (Pubs Récompensées) \- Volontaires :**  
   * *Dans l'éditeur :* "Regarder une pub pour obtenir une mutation rare (pièce dorée) pour cette génération."  
   * *Après la mort :* "Regarder une pub pour conserver 50% de la nourriture collectée avant de respawn."  
   * *Reroll Mutation :* Si les choix d'évolution des NPC ne plaisent pas, reroll l'écosystème.  
2. **Cosmetic IAP (Optionnel) :**  
   * Skins de créatures (Motifs bioluminescents, textures métalliques).  
   * N'affecte pas les statistiques (Pas de Pay-to-Win).

## ---

**8\. Instructions Spécifiques pour l'Agent (Jules)**

1. **Priorité Performance :** Toujours vérifier que les boucles de rendu (Render Loop) ne créent pas de déchets mémoire (Garbage). Utiliser des pools d'objets pour les projectiles et particules.  
2. **Modularité :** Le code de la physique (Verlet) doit être découplé du code de rendu (WebGL). Cela permet de changer de moteur de rendu si nécessaire sans casser la simulation.  
3. **Mobile First :** Les contrôles et l'UI doivent être pensés pour un écran tactile dès le premier jour (zones de touche larges, pas de hover).  
4. **Documentation :** Chaque module complexe (surtout l'algo de génération procédurale des créatures) doit être commenté avec les formules mathématiques utilisées.