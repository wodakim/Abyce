# **Architecture de Simulation Évolutive : Analyse Technique et Design des Phases Microbiennes et Aquatiques en Environnement Webview**

## **Résumé Exécutif**

Ce rapport présente une analyse technique, conceptuelle et architecturale approfondie pour le développement d'un jeu de simulation évolutive inspiré de *Spore* (2008), spécifiquement conçu pour être déployé au sein d'une **webview mobile** (iOS WKWebView et Android WebView). L'analyse se concentre exclusivement sur les deux premières phases de l'évolution biologique : la phase d'ouverture (Panspermie), le stade Microbien (Cellulaire), et le stade Aquatique (Sous-marin), ce dernier représentant une restauration majeure des concepts abandonnés par Maxis lors du développement original.

Le défi central réside dans la conciliation d'une simulation physique et biologique de haute fidélité—impliquant la dynamique des fluides 2D, la physique des corps mous (Soft-Body Physics) et des écosystèmes procéduraux régis par les équations de Lotka-Volterra—avec les contraintes de performance strictes des navigateurs mobiles en 2025\. Ce document détaille les stratégies d'optimisation via **WebGL 2.0**, l'utilisation de l'intégration de **Verlet** pour simuler les membranes cellulaires, et l'adoption d'une architecture **Entity Component System (ECS)** pour maximiser le débit de traitement des entités. Il explore également l'histoire du développement de *Spore* pour comprendre les raisons techniques de la suppression du stade aquatique et propose des solutions modernes, telles que le rendu **2.5D avec parallaxe**, pour surmonter ces obstacles historiques.

## ---

**1\. Introduction : Le Paradigme de la Simulation Biologique en Webview**

Le genre de la simulation de vie artificielle ("God Game") repose sur l'équilibre délicat entre l'émergence systémique et le contrôle du joueur. *Spore*, conçu par Will Wright, a établi les fondements de ce genre en promettant une transition fluide de l'échelle microscopique à l'échelle galactique. Cependant, les limitations techniques de l'époque et les conflits de design internes ont conduit à une simplification drastique, transformant une simulation scientifique potentielle en une collection de mini-jeux disparates.1

Le projet actuel, visant une plateforme **Webview**, impose des contraintes spécifiques mais offre aussi des opportunités uniques. Contrairement aux moteurs natifs lourds, le développement web moderne permet un déploiement instantané et une itération rapide. Cependant, la Webview agit comme une couche d'abstraction supplémentaire entre le code et le GPU, rendant la gestion de la mémoire et l'optimisation des appels de dessin (draw calls) critiques.3

### **1.1 Périmètre de l'Analyse**

Conformément à la demande, cette analyse se limite strictement aux phases pré-terrestres :

1. **L'Événement de Panspermie :** L'initialisation narrative et procédurale du monde.  
2. **Le Stade Cellulaire (Microbien) :** Une survie en 2D top-down dans une soupe primordiale régie par la viscosité et la physique des corps mous.  
3. **Le Stade Aquatique (Macroscopique) :** La transition vers des organismes multicellulaires complexes évoluant dans un environnement 2.5D, intégrant la flottabilité et l'hydrodynamique.

### **1.2 Contraintes Techniques de la Webview Mobile**

Le développement en Webview (souvent un wrapper autour de Safari sur iOS ou Chrome sur Android) implique des limitations sévères par rapport à une application native ou un jeu PC :

* **Plafond de Mémoire :** Les navigateurs mobiles imposent des limites strictes à la mémoire par onglet. Sur iOS, dépasser une certaine empreinte mémoire (souvent autour de 20-30% de la RAM totale) entraîne la terminaison immédiate du processus (crash).5  
* **Overhead JavaScript :** Bien que les moteurs JS (V8, JavaScriptCore) soient performants, le "Garbage Collection" (GC) peut causer des micro-gels (stuttering) fatals pour un jeu d'action fluide. Une architecture **Zero-Allocation** en boucle de jeu est impérative.7  
* **Limitations WebGL :** L'accès aux fonctionnalités bas niveau du GPU est restreint par l'API WebGL. L'utilisation intelligente des shaders (GLSL) pour décharger le CPU est essentielle pour simuler des centaines d'organismes.8

## ---

**2\. Architecture Technique Fondamentale**

Avant d'aborder les mécaniques de jeu, il est crucial d'établir l'architecture logicielle capable de soutenir une simulation évolutive en temps réel dans un navigateur.

### **2.1 Pattern Entity Component System (ECS)**

Pour gérer la complexité des interactions biologiques (milliers de cellules, particules de nourriture, débris), l'approche orientée objet (OOP) traditionnelle est inefficace en JavaScript en raison de la dispersion mémoire et des échecs de cache. L'architecture **ECS** est recommandée.

* **Structure de Données (Data-Oriented Design) :** Les composants (Position, Vélocité, ADN, Santé) sont stockés dans des tableaux typés contigus (Float32Array). Cela permet au CPU de traiter les données en rafale, minimisant les "cache misses".10  
* **Systèmes Découplés :** Un MovementSystem itère sur toutes les entités possédant une vélocité et une position, appliquant les vecteurs de mouvement en une seule passe optimisée. Cela permet de séparer la logique de simulation (biologie) de la logique de rendu (WebGL), facilitant le maintien de 60 FPS.12

### **2.2 Pipeline de Rendu WebGL 2.0**

L'utilisation de **WebGL 2.0** est impérative pour ce projet, offrant l'accès à des fonctionnalités clés pour l'optimisation mobile.13

* **Instanced Rendering (Rendu Instancié) :** Pour le stade cellulaire et aquatique, l'environnement est rempli de centaines d'éléments répétitifs (plancton, bulles, écailles). L'instanciation géométrique (gl.drawArraysInstanced) permet de dessiner des milliers de copies d'un même maillage (mesh) en un seul appel API (draw call), réduisant drastiquement la charge CPU.8  
* **Uniform Buffer Objects (UBOs) :** Permet de partager des données globales (comme les paramètres de l'eau, la position de la lumière, les courants globaux) entre plusieurs shaders sans recharger les uniformes pour chaque objet, optimisant ainsi le bus de communication CPU-GPU.14

## ---

**3\. Phase I : L'Ouverture et la Panspermie Dirigée**

L'introduction du jeu ne doit pas être une simple cinématique, mais une phase de **génération procédurale masquée**. Le concept de **Panspermie Dirigée** 15 sert de pilier narratif et technique.

### **3.1 Narration Visuelle et Direction Artistique**

Au lieu d'une évolution purement aléatoire, la panspermie dirigée suggère que la vie a été envoyée intentionnellement.

* **Séquence d'Introduction :** La caméra suit une capsule organique ou une météorite cristalline traversant le vide spatial. L'art direction doit contraster le silence et le froid de l'espace (rendu avec des shaders de noir profond et des étoiles distantes) avec l'entrée violente et brûlante dans l'atmosphère.15  
* **Impact Océanique :** Le moment de l'impact ne doit pas être un simple "fade to black". Il doit simuler la transition de phase : l'écran se sature de bulles, de débris, et le système audio passe d'un son étouffé (vide) à un grondement sourd et résonant (sous-marin) via l'API Web Audio.16

### **3.2 Initialisation Procédurale du Monde (Seed Generation)**

L'événement de panspermie agit comme le générateur de la "graine" (seed) aléatoire du monde.

* **Paramétrage par le Joueur :** Pendant la descente, le joueur peut légèrement diriger la météorite. Le point d'impact détermine les conditions initiales de la soupe primordiale :  
  * *Impact Volcanique :* Génère un biome riche en soufre, favorisant les extrêmophiles et une palette de couleurs chaudes (rouges, oranges).  
  * *Impact Lagunel :* Génère un biome riche en lumière, favorisant la photosynthèse et une palette froide (bleus, verts).17  
* **Génération des Nutriments :** Les équations de réaction-diffusion (Reaction-Diffusion systems) peuvent être utilisées pour générer les cartes de densité de nutriments initiales (tapis microbiens), créant des motifs naturels de répartition des ressources dès les premières secondes.18

## ---

**4\. Phase II : Le Stade Microbien (Cell Stage)**

Le cœur du début de jeu est le stade cellulaire. Contrairement à *Spore* qui utilisait des sprites rigides, une version moderne en webview doit viser une simulation de "matière molle" pour capturer l'essence de la vie microscopique.

### **4.1 Physique des Corps Mous : Intégration de Verlet**

Les moteurs physiques rigides comme Matter.js ou Box2D sont souvent trop lourds et trop "durs" pour simuler une membrane cellulaire convaincante. L'**Intégration de Verlet** est la solution technique optimale pour simuler des structures organiques déformables en JavaScript.19

#### **4.1.1 Modélisation de la Membrane**

La cellule n'est pas un sprite statique, mais un ensemble de points (particules) reliés par des contraintes de distance (ressorts virtuels).

* **Algorithme de Verlet :** La position d'une particule à l'instant ![][image1] est calculée sans stocker explicitement la vélocité, mais en se basant sur la position actuelle et précédente :  
  ![][image2]  
  Cette approche est extrêmement stable et peu coûteuse en calculs, idéale pour le web.21  
* **Contraintes de Volume :** Pour que la cellule garde sa forme ("blobby"), chaque point de la membrane est relié à un point central (noyau) par des ressorts, et des contraintes angulaires maintiennent la courbure locale. Lorsqu'une cellule heurte un obstacle, elle se déforme élastiquement, donnant une sensation tactile "organique" ("squishy").23

#### **4.1.2 Hydrodynamique Microscopique (Nombre de Reynolds Faible)**

À l'échelle microscopique, l'inertie est négligeable par rapport à la viscosité (Faible Nombre de Reynolds). Le mouvement ne doit pas ressembler à un vaisseau spatial glissant dans le vide.

* **Frottement Visqueux :** Une force de traînée linéaire forte (![][image3]) doit être appliquée en permanence. La cellule s'arrête presque instantanément si le joueur arrête de propulser.  
* **Simulation de Fluides 2D :** Pour simuler les "courants" de la soupe primordiale, une simulation de fluides simplifiée (basée sur une grille eulérienne ou des particules lissées SPH) doit tourner en arrière-plan. Le mouvement du joueur perturbe ce champ de vecteurs, créant des remous qui déplacent la nourriture et les débris environnants.18 Une implémentation légère de **Navier-Stokes** en WebGL (fragment shader) permet de calculer ces interactions sans surcharger le CPU.18

### **4.2 Rendu Visuel : SDF et Metaballs**

Pour éviter l'aspect "marionnette découpée" des sprites, le rendu doit fusionner les parties du corps.

* **Signed Distance Fields (SDF) :** Dans le shader, la cellule est définie par des fonctions mathématiques de distance. L'union de deux formes SDF crée une fusion lisse ("smooth blending"), imitant parfaitement la mitose ou la fusion de membranes cellulaires.27  
* **Metaballs 2D :** Une technique alternative consiste à rendre des sprites de gradient radial dans une texture hors écran (off-screen buffer), puis à utiliser un seuil alpha (threshold) dans un second passage pour créer des contours nets autour de la masse fusionnée. Cela permet de simuler des pseudopodes et des formes amiboïdes dynamiques à très faible coût.29

### **4.3 Boucle de Gameplay : Survie et Croissance**

Le cycle de jeu est : **Consommation → Croissance → Mutation**.

1. **Mécaniques Alimentaires :**  
   * *Phagocytose (Carnivore) :* Le joueur doit percuter des cellules plus petites ou briser des cellules plus grandes. La physique de Verlet permet de détecter la pénétration de la membrane. L'attaque avec un "Pique" (Spike) peut briser les contraintes de la cellule ennemie, la faisant "éclater" en particules de nutriments.31  
   * *Filtration (Herbivore) :* Le joueur doit naviguer dans les courants de fluides (visualisés par des particules) pour absorber le phytoplancton. Cela encourage un gameplay basé sur l'évitement et l'optimisation de la trajectoire.  
2. **Zoom Sémantique :** À mesure que la cellule grandit, la caméra effectue un zoom arrière ("Semantic Zoom").32 Les prédateurs géants du début deviennent des rivaux de taille égale, puis des proies minuscules. Le système doit gérer dynamiquement le chargement et le déchargement des entités (LOD \- Level of Detail) pour maintenir les performances lors de ces changements d'échelle.33

## ---

**5\. Phase III : La Grande Transition et l'Éditeur de Créature**

La transition entre le stade microbien et le stade aquatique représente un saut évolutif majeur : le passage de l'unicellulaire au multicellulaire. Dans *Spore*, c'était une coupure nette. Ici, nous proposons une transition graduelle via une phase coloniale.

### **5.1 Mécanique de Colonie**

Avant de devenir un organisme complexe, la cellule développe des protéines d'adhésion.

* **Gameplay de Nuée (Swarm) :** Le joueur ne contrôle plus une seule cellule, mais une colonie. Les cellules filles restent attachées au parent via des joints physiques rigides. Le contrôle devient plus lourd, simulant l'inertie accrue.34  
* **Fossilisation dans l'Éditeur :** Une fois la colonie suffisamment grande, le joueur accède à l'éditeur pour "solidifier" cette forme en un organisme multicellulaire. La disposition des cellules de la colonie suggère la forme primitive de la colonne vertébrale de la future créature aquatique.35

### **5.2 L'Éditeur de Créature : UX et Architecture de Données**

L'éditeur est le cœur créatif. Sur mobile, l'UX doit être irréprochable (tactile).

* **Squelette Procédural (JSON Schema) :** La créature est stockée sous forme d'un arbre hiérarchique JSON.36  
  * *Racine :* Le bassin ou le thorax.  
  * *Noeuds :* Les vertèbres, définissant la courbure et l'épaisseur du corps.  
  * *Attachements :* Les membres, bouches, yeux, nageoires.  
* **Symétrie Automatique :** Pour faciliter la création sur petit écran, un système de symétrie miroir est activé par défaut. Lorsqu'un joueur fait glisser une nageoire sur le flanc droit, le système instancie et met à jour en temps réel la nageoire gauche correspondante. Les matrices de transformation sont simplement inversées sur l'axe X local du segment parent.37  
* **Snapping Magnétique :** Pour éviter la frustration tactile, les pièces doivent "s'aimanter" (snap) aux points d'ancrage valides sur la colonne vertébrale.39 Des guides visuels et un léger retour haptique confirment la connexion.

### **5.3 Mapping Morphologie-Statistiques**

Contrairement à une approche RPG où les stats sont abstraites, ici la forme détermine la fonction ("Form Follows Function").40

* **Calcul de la Vitesse :** ![][image4].  
  Une créature avec de petites nageoires et un corps massif sera lente. Le moteur doit calculer la surface projetée de la créature pour estimer la traînée hydrodynamique.  
* **Calcul de l'Attaque :** Somme des vecteurs de dégâts des pièces "mâchoire" et "piques". La position de la bouche importe : une bouche ventrale force un style d'attaque différent d'une bouche frontale.

## ---

**6\. Phase IV : Le Stade Aquatique (Le "Contenu Coupé")**

Ce stade vise à restaurer la vision originale de *Spore* (Aquatic Stage), coupée pour des raisons techniques en 2005-2008.41 En Webview, la navigation 3D complète est risquée (désorientation, caméra complexe). La solution recommandée est le **2.5D avec couches de parallaxe**.

### **6.1 Architecture 2.5D et Profondeur**

Le monde est rendu comme une série de plans 2D superposés en profondeur (Z-axis).

* **Système de Couches (Layers) :** Le monde est divisé en Avant-plan, Plan Médian (zone de jeu principale) et Arrière-plan.  
* **Mécanique de Plongée/Surface :** Le joueur peut changer de couche. Visuellement, cela se traduit par un changement d'échelle du sprite et une modification de son "Color Grading" (les couches profondes sont plus bleues/sombres et floues via un shader de brouillard volumétrique).42  
* **Gameplay Tactique :** Cette profondeur permet la fuite. Un petit poisson peut se cacher dans les coraux d'une couche d'arrière-plan, inaccessibles à un grand prédateur dont la collision box est trop large pour cette couche.44

### **6.2 Physique Hydrodynamique**

Le modèle physique change radicalement par rapport au stade cellulaire.

* **Flottabilité (Buoyancy) :** La gravité est désormais active. La créature possède une densité.  
  * *Densité \< 1 :* La créature flotte vers la surface.  
  * *Densité \> 1 :* La créature coule.  
  * Le joueur doit gérer sa vessie natatoire (via des organes spécifiques) pour atteindre une flottabilité neutre, sinon il doit dépenser de l'énergie pour maintenir sa profondeur.45  
* **Traînée Quadratique :** À cette échelle (Nombre de Reynolds élevé), la résistance de l'eau est proportionnelle au carré de la vitesse (![][image5]). La forme profilée devient cruciale.47

### **6.3 Animation Procédurale des Créatures**

Il est impossible d'animer manuellement des créatures créées par les utilisateurs. Une **animation procédurale** est nécessaire.

* **Ondulation Spinale :** Pour la nage, une onde sinusoïdale se propage le long de la chaîne d'os de la colonne vertébrale.  
  ![][image6]  
  La fréquence ![][image7] dépend de la vitesse de nage, et l'amplitude dépend de la stat de "flexibilité" de la créature.48  
* **Inverse Kinematics (IK) :** Pour les créatures qui marchent sur le fond marin (crustacés), un système IK simple à 2 os (Two-Bone IK) calcule la position des pattes pour qu'elles touchent le sol procédural généré.49

## ---

**7\. Simulation Écosystémique et Intelligence Artificielle**

Pour que le monde semble vivant, il ne suffit pas de faire apparaître des ennemis aléatoirement. Il faut simuler un réseau trophique.

### **7.1 Équations de Lotka-Volterra**

Ces équations différentielles modélisent la dynamique des populations prédateur-proie.51

* **Modèle Mathématique :**  
  * Proies (![][image8]) : ![][image9] (Reproduction \- Prédation)  
  * Prédateurs (![][image10]) : ![][image11] (Nourriture \- Mort naturelle)  
* **Implémentation en Jeu :** Le jeu maintient un compteur global des populations dans la zone locale. Si le joueur extermine une espèce herbivore (![][image8] diminue), la population de prédateurs (![][image10]) déclinera peu après par manque de nourriture, ou deviendra plus agressive envers le joueur. Cela crée un équilibre dynamique et réactif.53

### **7.2 Comportement de Nuée (Boids)**

Pour les bancs de poissons et les micro-organismes, l'algorithme de **Boids** (Craig Reynolds) est utilisé.54

* **Trois Règles Simples :** Séparation (éviter la foule), Alignement (suivre le cap moyen), Cohésion (aller vers le centre moyen).  
* **Optimisation Spatiale :** Calculer la distance entre chaque poisson est coûteux (![][image12]). L'utilisation d'une grille de hachage spatial (**Spatial Hash Grid**) permet de ne vérifier que les voisins proches, rendant la simulation linéaire (![][image13]) et viable en JavaScript pour des centaines d'unités.33

### **7.3 IA Évolutive (Algorithmes Génétiques)**

Les espèces NPC (Non-Player Characters) ne doivent pas être statiques. Un algorithme génétique simplifié peut faire évoluer les espèces rivales. À chaque génération (respawn), les créatures NPC peuvent muter légèrement (taille, vitesse, agressivité). Celles qui survivent le plus longtemps transmettent leurs "gènes" (paramètres) à la génération suivante, créant une course aux armements naturelle contre le joueur.55

## ---

**8\. Optimisation et Performance Webview**

Le goulot d'étranglement principal est la puissance CPU/GPU limitée des téléphones et l'overhead du navigateur.

### **8.1 Gestion de la Mémoire (Garbage Collection)**

Le "Garbage Collector" de JS est l'ennemi de la fluidité (60 FPS).

* **Object Pooling :** Ne jamais instancier (new) d'objets (vecteurs, particules) dans la boucle de jeu principale. Créer un pool d'objets réutilisables au démarrage. Lorsqu'une particule meurt, elle est désactivée et remise dans le pool, pas détruite.5  
* **Structure of Arrays (SoA) :** Préférer des tableaux simples (x:, y:) ou des TypedArrays aux tableaux d'objets complexes (\[{x,y}, {x,y}\]) pour améliorer la localité des données en mémoire.10

### **8.2 Optimisation du Rendu (Draw Calls)**

* **Texture Atlas :** Combiner toutes les textures de parties de créatures (yeux, bouches, écailles) en une seule grande texture (ex: 2048x2048). Cela permet de dessiner toutes les créatures différentes sans changer d'état de texture WebGL, ce qui est une opération coûteuse.8  
* **Compression de Texture :** Utiliser des formats compressés comme **ASTC** ou **ETC2** supportés par les navigateurs modernes pour réduire la consommation VRAM et le temps de téléchargement.3

### **8.3 Design Audio Procédural (Web Audio API)**

Les fichiers audio (MP3/WAV) sont lourds à télécharger. L'API **Web Audio** permet de synthétiser des sons en temps réel.57

* **Ambiance Sous-marine :** Générer du bruit blanc, le passer à travers un filtre passe-bas (Low-Pass Filter) dont la fréquence de coupure module lentement. Cela imite le grondement des profondeurs sans aucun fichier audio.59  
* **Effet d'Immersion :** Appliquer un effet de réverbération à convolution lors des cris de créatures pour simuler la propagation du son dans l'eau.60

## ---

**9\. Conclusion et Recommandations Stratégiques**

Développer un successeur spirituel à *Spore* en Webview est un défi ambitieux qui nécessite une rigueur technique absolue. La clé du succès réside dans l'hybridation : utiliser la physique de **Verlet** pour le stade cellulaire afin d'offrir une sensation organique unique, puis basculer vers une physique rigide hydrodynamique et un rendu **2.5D** pour le stade aquatique.

**Recommandations Finales :**

1. **Fuir le "Tout-Simulation" :** Ne pas tenter de simuler une dynamique des fluides Navier-Stokes complète sur le CPU. Utiliser des approximations visuelles (Shaders, Vector Fields statiques) pour l'effet visuel sans le coût de calcul.  
2. **Exploiter le "Lost Media" :** Capitaliser sur la nostalgie du "Stade Aquatique" coupé de *Spore*. C'est un argument de vente unique (USP) puissant pour les fans du genre.  
3. **Architecture Data-Driven :** Construire tout le jeu autour de schémas de données JSON stricts pour les créatures, permettant un partage facile entre joueurs via des codes QR ou des liens légers, contournant le besoin de lourdes bases de données backend pour le partage de contenu.

Ce rapport fournit le plan architectural nécessaire pour transformer cette vision en une réalité technique viable sur les plateformes mobiles de 2025-2026.

## **10\. Tableaux de Données Techniques**

### **Comparaison des Moteurs Physiques pour Webview**

| Caractéristique | Matter.js | Planck.js (Box2D) | Moteur Verlet Custom | Recommandation |
| :---- | :---- | :---- | :---- | :---- |
| **Support Corps Mous** | Moyen (Contraintes) | Faible (Rigide) | **Élevé** (Natif) | **Verlet** (Stade Cellulaire) |
| **Performance Collision** | Bonne | Excellente | Moyenne | **Planck.js** (Stade Aquatique) |
| **Taille du Fichier** | \~75KB | \~200KB | **\<5KB** | **Verlet** (Optimisation Web) |
| **Stabilité Numérique** | Bonne | Très Haute | Dépend du timestep | Hybride (selon le stade) |

### **Structure de Données : Schéma de Créature (Simplifié)**

JSON

{  
  "speciesName": "HydroPiscis",  
  "spine": \[  
    {"x": 0, "y": 0, "size": 1.0},  
    {"x": 10, "y": 0, "size": 0.8},  
    {"x": 20, "y": 0, "size": 0.5}  
  \],  
  "parts": \[  
    {  
      "type": "mouth\_carnivore\_01",  
      "attachNode": 0,  
      "position": {"x": 5, "y": 0},  
      "rotation": 0,  
      "scale": 1.0,  
      "mirrored": false  
    },  
    {  
      "type": "fin\_dorsal\_03",  
      "attachNode": 1,  
      "position": {"x": 0, "y": 10},  
      "rotation": 45,  
      "scale": 1.2,  
      "mirrored": true  
    }  
  \],  
  "stats": {  
    "speed": 12.5,  
    "attack": 5.0,  
    "stealth": 2.0,  
    "buoyancy": 0.98  
  }  
}

#### **Sources des citations**

1. What Spore looked like before all of the "cute" changes ruined it : r/gaming \- Reddit, consulté le février 18, 2026, [https://www.reddit.com/r/gaming/comments/1agxdg/what\_spore\_looked\_like\_before\_all\_of\_the\_cute/](https://www.reddit.com/r/gaming/comments/1agxdg/what_spore_looked_like_before_all_of_the_cute/)  
2. Development of Spore \- Wikipedia, consulté le février 18, 2026, [https://en.wikipedia.org/wiki/Development\_of\_Spore](https://en.wikipedia.org/wiki/Development_of_Spore)  
3. WebGL Best Practices for Web Apps | Design and Develop Vega Apps, consulté le février 18, 2026, [https://developer.amazon.com/docs/vega/0.21/webview-webgl-best-practices.html](https://developer.amazon.com/docs/vega/0.21/webview-webgl-best-practices.html)  
4. Performance Benchmarking of Android and IoS Applications: Tools and Techniques \- ManTech Publications, consulté le février 18, 2026, [https://admin.mantechpublications.com/index.php/JoAIT/article/viewFile/1951/1250](https://admin.mantechpublications.com/index.php/JoAIT/article/viewFile/1951/1250)  
5. WebGL Performance | Wonderland Engine, consulté le février 18, 2026, [https://wonderlandengine.com/about/webgl-performance/](https://wonderlandengine.com/about/webgl-performance/)  
6. Understanding memory in Unity WebGL, consulté le février 18, 2026, [https://unity.com/blog/engine-platform/understanding-memory-in-unity-webgl](https://unity.com/blog/engine-platform/understanding-memory-in-unity-webgl)  
7. Web Game Performance Optimization \- Rune, consulté le février 18, 2026, [https://developers.rune.ai/blog/web-game-performance-optimization](https://developers.rune.ai/blog/web-game-performance-optimization)  
8. Best practices of optimizing game performance with WebGL \- Gamedev.js, consulté le février 18, 2026, [https://gamedevjs.com/articles/best-practices-of-optimizing-game-performance-with-webgl/](https://gamedevjs.com/articles/best-practices-of-optimizing-game-performance-with-webgl/)  
9. Web performance considerations \- Unity \- Manual, consulté le février 18, 2026, [https://docs.unity3d.com/6000.3/Documentation/Manual/webgl-performance.html](https://docs.unity3d.com/6000.3/Documentation/Manual/webgl-performance.html)  
10. Adventures in data-oriented design – Part 2: Hierarchical data | Molecular Musings, consulté le février 18, 2026, [https://blog.molecular-matters.com/2013/02/22/adventures-in-data-oriented-design-part-2-hierarchical-data/](https://blog.molecular-matters.com/2013/02/22/adventures-in-data-oriented-design-part-2-hierarchical-data/)  
11. Intermediate/Advanced Entity Systems: Data Structures for High Performance : r/gamedev \- Reddit, consulté le février 18, 2026, [https://www.reddit.com/r/gamedev/comments/1zvx0u/intermediateadvanced\_entity\_systems\_data/](https://www.reddit.com/r/gamedev/comments/1zvx0u/intermediateadvanced_entity_systems_data/)  
12. scene graph \- Hierarchical relationships in an Entity Component System, consulté le février 18, 2026, [https://gamedev.stackexchange.com/questions/206715/hierarchical-relationships-in-an-entity-component-system](https://gamedev.stackexchange.com/questions/206715/hierarchical-relationships-in-an-entity-component-system)  
13. WebGL 2.0 Achieves Pervasive Support from all Major Web Browsers \- The Khronos Group, consulté le février 18, 2026, [https://www.khronos.org/blog/webgl-2-achieves-pervasive-support-from-all-major-web-browsers](https://www.khronos.org/blog/webgl-2-achieves-pervasive-support-from-all-major-web-browsers)  
14. Optimizing WebGL — Emscripten 5.0.1-git (dev) documentation, consulté le février 18, 2026, [https://emscripten.org/docs/optimizing/Optimizing-WebGL.html](https://emscripten.org/docs/optimizing/Optimizing-WebGL.html)  
15. Directed panspermia \- Wikipedia, consulté le février 18, 2026, [https://en.wikipedia.org/wiki/Directed\_panspermia](https://en.wikipedia.org/wiki/Directed_panspermia)  
16. Exploring underwater depths with immersive sound design \- YouTube, consulté le février 18, 2026, [https://www.youtube.com/watch?v=wknSnArciUI](https://www.youtube.com/watch?v=wknSnArciUI)  
17. Complete Vision of Progression in the Microbe Stage \- Thrive Development Forum, consulté le février 18, 2026, [https://forum.revolutionarygamesstudio.com/t/complete-vision-of-progression-in-the-microbe-stage/958](https://forum.revolutionarygamesstudio.com/t/complete-vision-of-progression-in-the-microbe-stage/958)  
18. Fluid Dynamics Simulation \- Physics, consulté le février 18, 2026, [https://physics.weber.edu/schroeder/fluids/](https://physics.weber.edu/schroeder/fluids/)  
19. Euler and Verlet Integration for Particle Physics \- Gorilla Sun, consulté le février 18, 2026, [https://www.gorillasun.de/blog/euler-and-verlet-integration-for-particle-physics/](https://www.gorillasun.de/blog/euler-and-verlet-integration-for-particle-physics/)  
20. Making a 2D soft-body physics engine \- lisyarus blog, consulté le février 18, 2026, [https://lisyarus.github.io/blog/posts/soft-body-physics.html](https://lisyarus.github.io/blog/posts/soft-body-physics.html)  
21. Build a simple 2D physics engine for JavaScript games \- IBM Developer, consulté le février 18, 2026, [https://developer.ibm.com/tutorials/wa-build2dphysicsengine/](https://developer.ibm.com/tutorials/wa-build2dphysicsengine/)  
22. 1 Minute of Verlet Integration: Supplementary materials \- WLJS Notebook, consulté le février 18, 2026, [https://wljs.io/blog/2025/07/27/verlet-supp](https://wljs.io/blog/2025/07/27/verlet-supp)  
23. 2D Softbody Physics Using Sprite Skinning & Spring Joints \- Unity Tutorial \- YouTube, consulté le février 18, 2026, [https://www.youtube.com/watch?v=H4MTeKT0QFY](https://www.youtube.com/watch?v=H4MTeKT0QFY)  
24. Coding Challenge 177: Soft Body Physics \- YouTube, consulté le février 18, 2026, [https://www.youtube.com/watch?v=IxdGyqhppis](https://www.youtube.com/watch?v=IxdGyqhppis)  
25. Coding Challenge 132: Fluid Simulation \- YouTube, consulté le février 18, 2026, [https://www.youtube.com/watch?v=alhpH6ECFvQ](https://www.youtube.com/watch?v=alhpH6ECFvQ)  
26. Web Simulator | ShareTechnote, consulté le février 18, 2026, [https://www.sharetechnote.com/html/WebProgramming/Websim\_NavierStokes.html](https://www.sharetechnote.com/html/WebProgramming/Websim_NavierStokes.html)  
27. Drawing 2D Metaballs with WebGL2 \- Codrops, consulté le février 18, 2026, [https://tympanus.net/codrops/2021/01/19/drawing-2d-metaballs-with-webgl2/](https://tympanus.net/codrops/2021/01/19/drawing-2d-metaballs-with-webgl2/)  
28. Game based only on SDFs \- where to begin? : r/webgl \- Reddit, consulté le février 18, 2026, [https://www.reddit.com/r/webgl/comments/xuxmvh/game\_based\_only\_on\_sdfs\_where\_to\_begin/](https://www.reddit.com/r/webgl/comments/xuxmvh/game_based_only_on_sdfs_where_to_begin/)  
29. Metaballs and WebGL \- Jamie Wong, consulté le février 18, 2026, [https://jamie-wong.com/2016/07/06/metaballs-and-webgl/](https://jamie-wong.com/2016/07/06/metaballs-and-webgl/)  
30. Metaballs and WebGL \- Hacker News, consulté le février 18, 2026, [https://news.ycombinator.com/item?id=12103685](https://news.ycombinator.com/item?id=12103685)  
31. Cell Stage | SporeWiki \- Fandom, consulté le février 18, 2026, [https://spore.fandom.com/wiki/Cell\_Stage](https://spore.fandom.com/wiki/Cell_Stage)  
32. Semantic Zoom | Gosling, consulté le février 18, 2026, [https://gosling-lang.org/docs/semantic-zoom](https://gosling-lang.org/docs/semantic-zoom)  
33. A WebGL-Based Interactive Visualization Framework for Large-Scale Urban Seismic Simulations with a Dual Multi-LOD Strategy \- MDPI, consulté le février 18, 2026, [https://www.mdpi.com/2075-5309/15/16/2916](https://www.mdpi.com/2075-5309/15/16/2916)  
34. Microbe Stage GDD \- Thrive Developer Wiki, consulté le février 18, 2026, [https://wiki.revolutionarygamesstudio.com/wiki/Microbe\_Stage\_GDD](https://wiki.revolutionarygamesstudio.com/wiki/Microbe_Stage_GDD)  
35. The Aware Editor and Mechanics \- Gameplay \- Thrive Development Forum, consulté le février 18, 2026, [https://forum.revolutionarygamesstudio.com/t/the-aware-editor-and-mechanics/763](https://forum.revolutionarygamesstudio.com/t/the-aware-editor-and-mechanics/763)  
36. A Media Type for Describing JSON Documents \- JSON Schema, consulté le février 18, 2026, [https://json-schema.org/draft/2020-12/json-schema-core](https://json-schema.org/draft/2020-12/json-schema-core)  
37. Rendering symmetry \- Job Talle, consulté le février 18, 2026, [https://jobtalle.com/rendering\_symmetry.html](https://jobtalle.com/rendering_symmetry.html)  
38. Symmetry Hierarchy of Man-Made Objects \- School of Computing Science, consulté le février 18, 2026, [https://www2.cs.sfu.ca/\~haoz/pubs/wang\_eg11\_symh\_reduced.pdf](https://www2.cs.sfu.ca/~haoz/pubs/wang_eg11_symh_reduced.pdf)  
39. Drag-and-Drop UX: Guidelines and Best Practices \- Smart Interface Design Patterns, consulté le février 18, 2026, [https://smart-interface-design-patterns.com/articles/drag-and-drop-ux/](https://smart-interface-design-patterns.com/articles/drag-and-drop-ux/)  
40. Dynamic similarity and the peculiar allometry of maximum running speed \- PMC \- NIH, consulté le février 18, 2026, [https://pmc.ncbi.nlm.nih.gov/articles/PMC10928110/](https://pmc.ncbi.nlm.nih.gov/articles/PMC10928110/)  
41. Aquatic Stage | SporeWiki | Fandom, consulté le février 18, 2026, [https://spore.fandom.com/wiki/Aquatic\_Stage](https://spore.fandom.com/wiki/Aquatic_Stage)  
42. 10\. Underwater \- Crest Ocean System, consulté le février 18, 2026, [https://crest.readthedocs.io/en/stable/user/underwater.html](https://crest.readthedocs.io/en/stable/user/underwater.html)  
43. If you use depth-based fog fog to simulate underwater effect, how would you stop it from reaching above the water surface? : r/Unity3D \- Reddit, consulté le février 18, 2026, [https://www.reddit.com/r/Unity3D/comments/10ifolh/if\_you\_use\_depthbased\_fog\_fog\_to\_simulate/](https://www.reddit.com/r/Unity3D/comments/10ifolh/if_you_use_depthbased_fog_fog_to_simulate/)  
44. GonzagoGL | SporeWiki \- Fandom, consulté le février 18, 2026, [https://spore.fandom.com/wiki/GonzagoGL](https://spore.fandom.com/wiki/GonzagoGL)  
45. Similar Physical Model Experimental Investigation of Landslide-Induced Impulse Waves Under Varying Water Depths in Mountain Reservoirs \- MDPI, consulté le février 18, 2026, [https://www.mdpi.com/2073-4441/17/12/1752](https://www.mdpi.com/2073-4441/17/12/1752)  
46. Enhancing Buoyant force learning through a visuo-haptic environment: a case study, consulté le février 18, 2026, [https://www.frontiersin.org/journals/robotics-and-ai/articles/10.3389/frobt.2024.1276027/full](https://www.frontiersin.org/journals/robotics-and-ai/articles/10.3389/frobt.2024.1276027/full)  
47. Energy-based solution for the speed of a ball moving vertically with drag \- Naval Academy, consulté le février 18, 2026, [https://www.usna.edu/Users/physics/mungan/\_files/documents/Publications/EJP3.pdf](https://www.usna.edu/Users/physics/mungan/_files/documents/Publications/EJP3.pdf)  
48. Procedural creature progress 2021 \- 2024 \- runevision \- Blog, consulté le février 18, 2026, [https://blog.runevision.com/2025/01/procedural-creature-progress-2021-2024.html](https://blog.runevision.com/2025/01/procedural-creature-progress-2021-2024.html)  
49. Rough prototype of procedural animation for many-legged creatures : r/Unity3D \- Reddit, consulté le février 18, 2026, [https://www.reddit.com/r/Unity3D/comments/dgzqsv/rough\_prototype\_of\_procedural\_animation\_for/](https://www.reddit.com/r/Unity3D/comments/dgzqsv/rough_prototype_of_procedural_animation_for/)  
50. 3 simple rules to procedurally animate a sea-creature, with character model download, consulté le février 18, 2026, [https://dev.epicgames.com/community/learning/tutorials/Peb7/unreal-engine-3-simple-rules-to-procedurally-animate-a-sea-creature-with-character-model-download](https://dev.epicgames.com/community/learning/tutorials/Peb7/unreal-engine-3-simple-rules-to-procedurally-animate-a-sea-creature-with-character-model-download)  
51. Lotka–Volterra equations \- Wikipedia, consulté le février 18, 2026, [https://en.wikipedia.org/wiki/Lotka%E2%80%93Volterra\_equations](https://en.wikipedia.org/wiki/Lotka%E2%80%93Volterra_equations)  
52. Tutorial: Predator-prey models – Ecosystem Modelling with EwE, consulté le février 18, 2026, [https://pressbooks.bccampus.ca/ewemodel/chapter/tutorial-predator-prey-models/](https://pressbooks.bccampus.ca/ewemodel/chapter/tutorial-predator-prey-models/)  
53. procedural generation \- Building stable ecosystems \- Game Development Stack Exchange, consulté le février 18, 2026, [https://gamedev.stackexchange.com/questions/82862/building-stable-ecosystems](https://gamedev.stackexchange.com/questions/82862/building-stable-ecosystems)  
54. Boids-algorithm \- V. Hunter Adams, consulté le février 18, 2026, [https://vanhunteradams.com/Pico/Animal\_Movement/Boids-algorithm.html](https://vanhunteradams.com/Pico/Animal_Movement/Boids-algorithm.html)  
55. A Multi-population Genetic Algorithm for Procedural Generation of Levels for Platform Games. \- UFMG, consulté le février 18, 2026, [https://homepages.dcc.ufmg.br/\~lferreira/assets/papers/2014/gecco-mario.pdf](https://homepages.dcc.ufmg.br/~lferreira/assets/papers/2014/gecco-mario.pdf)  
56. Personalized Procedural Map Generation in Games via Evolutionary Algorithms, consulté le février 18, 2026, [https://www.researchgate.net/publication/265294283\_Personalized\_Procedural\_Map\_Generation\_in\_Games\_via\_Evolutionary\_Algorithms](https://www.researchgate.net/publication/265294283_Personalized_Procedural_Map_Generation_in_Games_via_Evolutionary_Algorithms)  
57. Procedural audio using the Web Audio API \- Audio Engineering Society, consulté le février 18, 2026, [https://aes.digitellinc.com/p/s/procedural-audio-using-the-web-audio-api-2413](https://aes.digitellinc.com/p/s/procedural-audio-using-the-web-audio-api-2413)  
58. How to Generate Procedural Audio Textures in the Browser (No Samples Needed) \- Dev.to, consulté le février 18, 2026, [https://dev.to/hexshift/how-to-generate-procedural-audio-textures-in-the-browser-no-samples-needed-332l](https://dev.to/hexshift/how-to-generate-procedural-audio-textures-in-the-browser-no-samples-needed-332l)  
59. Web Audio API \- W3C, consulté le février 18, 2026, [https://www.w3.org/2014/annotation/experiment/webaudio.html](https://www.w3.org/2014/annotation/experiment/webaudio.html)  
60. Making Reverb with the Web Audio API \- gskinner blog, consulté le février 18, 2026, [https://blog.gskinner.com/archives/2019/02/reverb-web-audio-api.html](https://blog.gskinner.com/archives/2019/02/reverb-web-audio-api.html)

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADYAAAAYCAYAAACx4w6bAAACIklEQVR4Xu2VzUsVURjGn8jAMChQlKAIE1qFCq1ctDMsaBUJbURooRuDCCFopYgQERQVBVIiQkRtIrRVof+A2yhQEERwV5talPTxPL5znLnnztedewkuzA9+3Jkzc+89z7zvOQOUlJSkcJhO0l7/QrNzkf6hS7CQdXOdfqDt/oX/iIK8gwX7TS9UXo6lk67QEf+CaKXvA3VcK/dpnz9YAAVZpLfoX/qGHqq4o5pB+iv4rOIE3aaz/oWcPKbn/MEaUbVe0fO0i36mP4PzNO7QHXo6OniEHqfDdJdeg/1o1lPyaUQwBZhH+N8TsKopbIu7KeAgrAVPwZbPKu2mx9wNo3SObsKezkv6iPa4G3JSbzCFUahodU7Sddi8BiLj7toD+ha2HtdgOcboAXdTvetL1BtME49Wy3EbyVUTDVtfCq7W9X1Bh2LGtcPuP8EENOEFxO+Aai/N7QfiH1zs+nKkpva4Ciu57xdYW/jjdxHp+wRULVUk6Z01Bavac1RWLbPTUlPnpGgraqJPYS/lJFzVvtGzkfHUTnOpP9I2WI/fg32pFooG03deI7laQq08A6vak+BcqMP0Er8UnGvjuREco4N+Qpj6Cr2J7HXhUySY/kMT/U63MvwKCxat2jjCTjtKn8G2/z3049N0A/bkdOzvTHkoEkwT1EQ14Vp8CJv3GYRre5n2IwYt8KxFnkaRYI1ARdCLukgxcnEZtr2XlJSUNC//AEC4eqCYoeDGAAAAAElFTkSuQmCC>

[image2]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAmwAAAAjCAYAAAApBFa1AAAEI0lEQVR4Xu3dWah9UxwH8CUUUaYiRSJDhqK8mYoQZUgylOHBiwfDg5L+hvoL5UVJokSiJCIkJSnnUSlDKSIPpJTyoihkWN//2vuefff/3NG5A//Pp76dvdc695x19v3X+bXW2vdfCgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD0jqp5qua8cQcAANvDz93jIzUHDDsAANhY99YcNG6c4ezu8Yma/YYdAMCe6+qa02s+qfl91Md8nFrzd83n447OyTXnDs4fr7lmcA4A7MHOrPml5oiavWpeqrl00TP+v+4ZN2yQFGtv11xS81fNYYu7F677Id35bTVH1pzU9QEAm+Tomsu64xRE+ULeDrJE93rNgd35CzWXT7t3jTljT5Gx0YVcisfs2UqRclHN/ou75261BdveNReX9e8ne7DmxtI+z7s11w/69i2toPuytH8T+T38WdpsXAIAbJIUH/1Myfc175Q2qzVvh9Z8t0wemD51putKKxb6sd7fPaaIy5Jdxp2iat7yfg93x9/WvFzzU82kf8IGWU3BdkzNju74hporBn2rlWKtl4JsXIjdWtrnBQC20J3dY2ZoXittU/mV0+41uaXm4HHjnHxRs3NwfmJpY36/Zp/Sxp3ZppWkAMuMXGaMZmW8kT6FZl8c5g7JFEY31Zyy8Iy1uXnc0MlsVpZ++3E8NDhODp8+dZd85mdrju3O7yqtcB17subDcWMnPzt+3RRs/YxmZDn0o8E5ALCFMjtzzrhxGbNmsz4tSy+nplAaF0fDLFfoZfasn1k7Y9CeMf82ON9Ief8ULv1ervWajBuWsNIMW5aG+9mwFHrfDPqGji/tpo1Z3hw3lLYkmqXRfsn319KKVABgi/Rf9NlA/nFpMyt3l/YFnaWy3BmYuzRTPIwLiLUWbOuRWaedZbpsmiXb40ob92eljXlSWjGVcUfG/FXXNh7zemRvXAqj88v09bIMm0Io1yjvtdQ1mmUybljCSq91WpkuVWaWMcvY99VcuPCM5eUa/lh2X5pO8nlTtEVfpD5dVvdnPwCAOUtBlOIjX853lLYkuqNrP6G0OwdTxD1f2l6ms2qe6fJG9/hYmZp3wdbfJdpvck9SPGR8ubMxY05BkRsTMu7ImN8rrWDLmP+tFIgpDN+q+brmuZoLur5co7zX8BrluL9Gffpl55gMjpezUsGWz3d7aeO5qrQ/yZHfRa7NauRnh9d1nOwXjB9qXintfzgAALaZ7JF6tTvO43ApMjZjhm09MtYslSYZ87WLu+cq16jf6D/rGs0yGTcsIcUxAMCysmT2QXf8Ytl9xmdYsGWjfpYk/yhtlm4rZczZTJ9CKmPeyGW8XKN+0/+sazSUPXqPljZjuJrCDgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA+A/7BwPBofg1S+4iAAAAAElFTkSuQmCC>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHUAAAAYCAYAAADEbrI4AAAD70lEQVR4Xu2ZWahNURjHP5lDZhIyRCKiTBnzIPHAg6EUHqSQSCiiREkiZcgcyQOSOZllLMSbB8pQksgDD0JJhu93v73uXmeds+/guo6j9at/9+y11977nPWNa1+RSCQSiUT+Gxqp2qvqhyeKwQTVzyros2pgck0kpY/qidgavRAz7D/DIdU31chgvK5qruqNqndwLmI0U91RnVDVC84VjZaqh5LtaW1U51UdwhORMnD296oV4Yli0l/1UXI9rY6qSfIZo+5WNU2OI7lMVv1QjQ1PFJMZYjVhqTeG920WM24L1bTkcySf7aqXqo7JMcEwTtXDTaghNF+jxXoayiHwd7hYwBVkv+TWUy7YoJpXPiOShStdlCc64AGq46o1qntSuJxVh+Zi/c5i1TPVnGTcNbjYLg/3pZhAM/Qp+fxFNdib96+wWvWqGrqkalV2Ze3g19NhqlWqzmL9SVaPUh0ILDJpN9VrSes2v4nmDIPnQUizXfHrKV/0mmSHNmnmtpgTdA/OlSKkNxafRrAytZM0BQILTj1lcZeJ3QvNVo3w5oUQgWdVZyS7V8EeGJFnThcLNBzHwbP9klmOq6d+5+bX0yxoCk6LpZxSh5S5r4rapupadpVBPf2u+qC6LFb7Klo3h2tO36l6BedCMO5R1X0xZ3AslwLNGQ8/KPn7UzzNdb5ZkGbWh4N/Abw6jJ6KFEbWn8TfnzZUrRRbyzHenCxYewxblWaKbPhWcte7sWqrFMimle1PQ3h7ghPgrXfFinXb5JhCTmt/RNIUwWJOUZ1SzRLr1vzNOffbq9oh1i1Wpfb1U02thviOLEBtEO5PXSkj++F8W1Stk3M1wd13ojfGGhOpeRSqp1lgnJNiX5aofi7mQTNVo1SPxQxDSl4rdr+dqoViXklk+88ZImZs0klfsVdtpfbGapLqq6RZjvUknXKcuei/gUvVBA2wZrtUncpniOVhmhz/3S41IatTxNuI6PHJMddfFEvRPZPxK2IG54Gkb37UA0kzALXHFXXm3RTzaGARbolljlJirZgzut/Ib6fBZC1w4C7JeE1hPTeKdb8HVFdVg3Jm/AZ44CNJPSOsp6SfsL4ydlgsSjHiBUk9Gs97Kmlk0rZj9FKDJjHsXCk51Lna+G8Nz8KB/si9MaprvalPGIjUs0Asis+J1S4fjOpqDemVzo3opTUnbVOTaWT4gqRsF7WRvwTGpJ1fIrbVYX9FTsdAeM4Nsc2xDw0NKWi+ao9YWtokFp1EL7X2mFhj9TIZjxQBWnjSC0ZxWx7/cwhzuQaIyAbeOQdvra5L6dXTiAd1iHS7SMzQRDFvYiIlDJFNPV6XaGgyFolEfH4B1ivFp5x+xYUAAAAASUVORK5CYII=>

[image4]: <data:image/png;base64,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>

[image5]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADsAAAAYCAYAAABEHYUrAAACiUlEQVR4Xu2WTagOURjHHyFE+YwshAXFBvkokSQWColEWQplJSUl5WYjYUOxIR8LpeykFMnOZ9lRSiIpFkTYSPx/npk7Z847933P3I1xm1/9ambOmfc9H8/znDFr+a+ZL89kcj1kWST3y+FyhXwrV5Z6DCEOyVdymhwhb8gLpR4B6+XvBL/Lxdk7TWKKXCaHydHylnk4d+WK/GmdIUB47JHv5byorWmwGewyoT0gE+UTK8IhhtVjxabHDQ1ivLwml8cNMQvkV/N4J+6BsBibXTPZ83Jcdt80mOhJ88hj/HPKzWV2muflgeAZL54yn/QEuS277sVkuVGuNs+hmJFyiXmtGBO1xZBChOYq8/eAMbA5M7N7nh8131Eij/zdnbVVQvUK85U/OS739vdIY4t5KlyXH+UXucGKRVojX5sXkF6TZRKn5UH5MLuGPArvmkfeLusspoyjkjxf6UQR+pZd/5BLg369mCEvmocUMBEW8Zfcar7ijyy9yK2TR8zHx2QpoMDvXpb3bRBpRZhwrIT5yoBYOXI1FUJnU/SMifM7n+UL62zvBr/HOAhPFn5H0EYEng3uk8nzlcM5J8zXVI5Z9TnMMcBk71lR8OrQJ9/J2cEzwrRuiv2dzCXrPF/Jl7oDY7GqJjtK3rQinOuQp1h8SvRZejr00+t8rcN28yocw3NC+al8aUUVTYHq+sbKUccOE3X55JOpytfBMlWes6JAwVr53LyCUqAIZxZ3VtCnG2wAG3E4uyfiTliPL6QYBkHlDcv1J3lbTgr61WWhvGNelZ+ZV9G5QTvXj83/74H5AnWDkN0nP8ir5uPbXOrxj+GMZhJ8iAwEbfShbwp8nBDSVR8pLS0tLS2N5w+t/nnS5oRE9wAAAABJRU5ErkJggg==>

[image6]: <data:image/png;base64,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>

[image7]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA0AAAAYCAYAAAAh8HdUAAAA2ElEQVR4Xu3RsQpBURzH8aMoYlCSxSDZDYrMGKSslAcwMDGaPQAWMZg9AoPRYvAEVsoimwnf0zn/6ySjRfnVp3v//3O699z/VeqfX4oPKQTe+pIwSvbqpYIVIm7TyQAPtKURwhIFaXxIFmf0pFHECH5b66O2UJcNNgtUpeii/FpTCRwwdHr6gROkpaGLnLds7o/KnECSwQxBaejXukdpYIe4rfVEp2h6O8gYJ2U+co4b7tiggz3W6m2yeVyUGekVNfRtrW2R9HY70WfVA3B/bhQxZab5z9fyBEXNH00NrZQqAAAAAElFTkSuQmCC>

[image8]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAAYCAYAAAAs7gcTAAAAyklEQVR4Xu3RsQtBURTH8SMpokRSVslgYDAbKMrfIKtZFgMjo1JmyYBRFrNdKYPJ5A+wKJOB73n3vZIno+n96jPczjm3+84T8fLv+FFEDWH4kEUVobc+iWKJDno4YowhplgjqI16wwAla0wkhQtWyOOKHSJajKMv9iQp4IYGAmgiZ9dc0aa7mPf/jD5phj1iHzUr+nETtJDAScyADmp0G1qzUscTI5TxQNeu6UVzZOyzpHHAAhu0cRazsi0qTqMT3URSzI/5dvbiygvC9RzA6VnpHQAAAABJRU5ErkJggg==>

[image9]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAH4AAAAYCAYAAAA8jknPAAAFXUlEQVR4Xu2aV6hdRRiFl1iw94oNxShqbKgPsRG7YjcKFvQhYsWGopIomgdFY8GGBVGDig3URIJd9KIPBhQL2FCEKBZEfBEURCzry7/HM3fOPeeeA3fva657wSLZM3P2npm/rH8mkfrjfPM384ayo8XUxqrmQvOQsqPF1MYW5hJz27KjxdTDaua55nPmreZL5hrmyuZsRQY4wbzOvNfcKH7WYgKwpXm8uae5YtFXK9YxXzCPMFcyn1FH309TRP5W5ofmseZXamVgIkCwzTNvN08y7zJfVNijEZyl+CATQd8Xm0cqnGBaNQZDv6qY1AZq2DOnIFYw55uzsrbNzKWKvW8Ej5hzq7/30ver1Fb5E4lDzWsUDpDA3n9rHpO11QoMnz5GukffD1Z43lPmYQopOFEx0YvNDavxLYYHmZQ6apuinb3/zty5aK8Nh5uPKQxK4fayeaO5g/msea25SKFBRD5O8V8AsjRT4bSbjO7qAgXU0dWfALnCsUmvTYNsereicGYezJ1Aes28UqOzAJJK0UfwUWzTt70iYyDN5bgDFO/NgTyXbf+CDl4MVqmey/ZU5U82mMMVimLzHPNM8wvzcsXGsCF7KTaD50vN+6pxn5o3m48qNvlLhYM3CRzubPMm8++MDyuyQQIGe8K8zLza/Mi8QyG5DylOWjg/+0E7cv2WeRs/rsDafjRPydpqx3bme+Y3Q/DUZb/sDRaJET8zt87aWdjP5nRzP4V+glJLkTV0dEeFfP2qiJQmMcfcW7EWop2on2Z+bs6oxjDf6839q2cy09fmk+auirWOmGuqs8a1q7an1Sm+T1fcwvK95RrUGX+q24MxHkYk6onotIHIF6kRkLFeVxxXiax9zePU/4SyrmLTByFGGA/MgTRf1kj8dkSdAnp9hTGJaLCb+YvCkDjMGeZOVR9X7PSzZoyc7w3y/Im6vzcq1QzLpsEmEKU/qPvUwTPtRMSdGp0yE9IY6pRBwPeQlAcGJMfi8cAcSMW5joO1zLfNB4v2BAw+Xnaap8hmqWhcz3zXfFzd36sVRNLG6o6MfuwXNfST7jB+ioSy7yf1roq5fPpdIQWThaTvJZAe0je3pyUw2gKFETHmWEgZI2UzkLLEWO+sFaS1oxS3UoOSDegF9JBbQ3S6RDL8LVkbGzbbvF+xMaS9pebmVT9Oya3Z6tVzEyCVI1clyELfK+oiQGGHJFC8kqZJ1xg/RS66Tl9CWn+ezcgSf2hIR+dMSfTkHsQG9dPDusE8SIUcN/OjDBcfzPMvhVPgcBRLyVGohqlu31enIGIDSeNsTlNgXq8oKnJ0OmEfRYrOHYLMgJwiCwcqDJiMilOwzuQkIK01H0M9M6a+jwciJKUJXsSG99OYJrCp4ryLHqKrXCNzB4HxObaxgSOKTWRz2aDFirlfpEiXOAn3E3OqMU0Bfb9HYZwRxfyfVxzBUqGWwFgcFX1mDGvj6InTcL1+UGfoMuDIFLasnzGsE8fJs8RAoNjAO1OaQC/Y7KG9pyZQbePlpeFoz+uEVGekmqB8bhK5vjNH0nO/edDHXFOWLZ9z0Ad5L/syQ6Hv5elnTPDCWYp/muVItETxr3KkRCKLczYVc7r9ajEcyDB1nKfJdtxrkNqREySRu46PFY7SF0QORdCFitRAEZLre572WwyPXuf3iQDZmNs5bIe9LlHcZO6eD+qFmeYH6tx5Y2iuCgFHiDdUj7f+X4AEnawh9XZAELTo+zsV5ytu8QYCBUc66Jf6zhHrTdXjrS0mGRg+HQWmK/SdAoHigCMPToFnXaAG/4dIi/qxi0LTz1NoEYUCBR7RzmUBR6i55h7pBy2WP/wDrLMLeOpj3yAAAAAASUVORK5CYII=>

[image10]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAYCAYAAADDLGwtAAAA9ElEQVR4XmNgGAXUBMxAbAzEdkDMiibHDxMDEROAuAqIDwFxL5IidSB+CcQRII4rENcAMR8QHwDilQwQG0AgGoi/AbEpiJMJxPpAbAkVBOuGgklAfBWIRZDEGBqA+AkQK0L5gkB8GoiXAjEjVIyBhwFi7RogZoGKgWz5BMTpUD4YSALxQyAuRxIDue83ENsgiTGIA/FdBoRCUJDsYcDiPpAbihkgbpzLAHHbfyCeD5WDAw4oBrkVZDooBEDuQw4BBhkgvs4AsYqbAeKZ6UB8BYjFkNSBfQcK/RyoonwgvgXEBsiKQAAUhSD3HYfiTgZILA0WAABa1ibOSzQ4bgAAAABJRU5ErkJggg==>

[image11]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAAAZCAYAAAD6zOotAAAFK0lEQVR4Xu2ZechlYxzHv7JkzRpZB4lsIUspacoyZCmMqGmM7AplS1nqLcQfdoVsQ7Im0mQYxKtRY/nLH5aUzEjkD5SQUZbvZ37nufd5n3vufe+b3PPe1/nUt/e85zzn3nOe57c+VxrMpdZv1q3lhZa5wcbWy9ax5YWWucEu1vvWnuWFlvFlE+ti6yXrDus1a3NrgbXcOrgax+KfZ21Q/d8yBmxpvWqdoFi4FxX5d19roXW9NVGNxQgerY6bBIO8yLrPOtPayVpvyoiWDucrvJRJI/8us060trd2q64dpZjAp61FcVuj3GSdbZ1j/WqtsXacMqKlw5MKL4Uy/x5qvWltbW1nrbQOqq41BanjWXWfkYU9UK0H94UFPqU6JkyTf4+x5lfn8Vom73DrbcViNw2h+Wa1izoUFFJPWVdYD1ivW7cpQvQ8RX6+wFql2ZF/AUP83TqjvNBSz4bWZtXxRtX/yWt3sLa1XrBOrcY0zTbWB9a31l7FNeD5j67E8fqKdEMtwXGC96Le2DU7B9xD8TlK+L7j1fuMwNrwTJDejffJx7FeRNfy3r6Q1z5V5Fw85X51v6QpeImTFc/1uPWXIh/nbRtRh42aVGW/az1iXWutsO6sxh1WjaP++NLapzoPjKEWGcUi804Ui39Yf1d6WN25xgiJrPzleUiZ1yjmgAI5Md/6yToyOzcQvmCJdYt1mmZgGRVUul/PQKQGPHMQbKN+rFhEXpZF+EZRHAKdwEPqejVWTpU9odiZwyCWWptm44hKbM2micELPlK39vivOc76XpEiD7Aus360Tq+un6VoT4G/dDE7W6vVbV+B1jafi7Fjf8VE0B4l8FAWkIUEFuzK7uV14XetIuwR5vBqJoCQfIPCiIkAubfS//+g7qTWQTtJ9T6M8Lx+hoJBPmMdUZxn0Z9QGBuGSJokSuE0fCZzkBslz0OthDjukELCTNUEWOhqhfUmrtNgq627J2cPxf0T2Tk8hMmj/ugHhkMYHUa3W1vFbT0QFVnE0gC2UNy7WFMNFljo0ihpGb9Tt90dCfSrpTUPElV7vzSA972l2GXL8y0LOKn4rhLOTar3nhzC81qFhyfoFD5R9P1NQt59T2GEOSk88+4JDO5PjfgHIoo0tjqHFQ9JyKojLTA9eyItIDkrgSc/pwhxKdTi5YkLFZVqgmtrFAYGKf8OMopRgTeWBSSkuiLtXQCLjQenzZ9poZghTCUrIYSkNqopWAwKsWQELCKLgecnrlKkEKrLc6vjNBHzFP0+OTHB+HyB6RbwhEH5d1QQmun3S+hqftbU9/pCNfl3EAzMfxMmmfMBdaFwVGBgtDuTCk8mfOGlOYRaqmwq4KWK3S7C7WPWK+odz+Qwnt275xVtRl60NQVeS1ta55EUhg9anyne63OFIeeRalrKPWksnYp1NoCRDcrXXM8r1/L/BP9TzDCZfB4tGkYxqv53EMz7G6qvA9KmB4Ubz00Lm1fUfSH0EZry34T3s+61vlJ4DgvNTtdc4GpFX0zuh0MU/eclnRHNQfHHzmGZf3lGokzaMsZ4MYRl6l+/rAOLJQQT8/lQioyUf7Gid9Qb3sYdJokcTrTa3fpQYdh4R9Mw93V1AMb4i3WSYkHvUjx3vzaxA0XJcvX+JgzktRWKcDaX2FtRtK1UVOjs75ZhvCnuVuxqlRCe2UZdpUgll2saz01QtKQmucy/WNJsyb//F8rQ/K9hget+E0aEa/ZF2d5bUo1pGTMWqP43YfZA71GEhRvVfHXZMgT/AGKcCYlBZBZUAAAAAElFTkSuQmCC>

[image12]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADgAAAAYCAYAAACvKj4oAAADZklEQVR4Xu2XTYhOURjHH6HIV77zHVmQ70SULCSxYIGFwlIsrHxGFm9JYiGhCDVZIBELaZAyZbJgp0QhkQghSyn8f3POGfece+/b+87MO7OZX/175z3nzr3nec7z/M99zXrpcfpKG6Tz0kFpaDzd/QyWBqSDnWC7tMxcoIekVmlkZn6Y1D/zvS640SppozTT3EOqMV9qMvfQroBktUgX/fdp0kdpTbhALJYuWx3P7CMtl55IzdJmr/vSK2nR/0sjJkoPpVnphBglPZL+ev2QZkdXmO3zc0EfpDleU/w1JJkAV/rvgS3SOathJ7ngmPTW8oEwRx+wuAXJHEk5KVWS8ZR10k9zAVTiqTZI0mNpRjrh2W8u0exsloHSbWl9Mh5BAGel7+a2vQgy+E06Yy6oALvx0n9Wo2Kup9idF9LYaNZsnnRB6peMA2u6Io1IJzybzCWntFR3SH/8ZxnDpafSc3NlFyCzd6y6uQwy10vsEgliF1lUFlphVzIG9PZRc/cgwDHxdBv052tzhpRjurnaLspqlhDgO2mcHyMogsPCq8EC2B2uXyr9ku6aK68A7ZEukP47Lk0298ytlm8fIPgHVrKOirmMHknGU1jkJ4sD5JPva8NFJeB8e/3fBEVwBEmwQPKuWZxgknHL8uZDFRRxyZyjZtun3Yopz9SdUpjnOhxxiB9bKH22fOZTKhbfn/JkwaGf6W88oKj/aoVWabHEhMIOYB48pBqnLO+ABPjef5YR+m9CZoydoiXYkalW3n/1QIC0ENXQTggwW3ZFTDJ3Dn61+KyrJcBs/2WpmEvYTivuv3ohwDeW+AhuiCtWC5ASOmBuMbuTuVoC5Pzj/1OCuVHi9yx25o5QWKLU/FXpt5VnkDOIA56DPn1bKHp9SqlYcX+TuHBk3LDO9R9gkjgpLRHBmwkBNFk+gBXSF+mExZYeCBXAAV7EaHO7Mzed8IQjo+z/a4Vk4aD4RCGcLRyUvIOG989m6Zm5ICPrzcA4iUlvzGHMvbIWf9ryL+wk7aaVV0+tYCw8j3YohYfjpPx64Fwbb+WBZcHyuXnkXt0MlYAr48hdDj+rWqXV6UQ3wSYc9qplQzoEpXHdivu00eDGmAuvdQ2DzPEqhhqWxQIwRTyg6k+lroKH7ZGWpBMNZJv1XGv00nD+AUEco6cvCwNWAAAAAElFTkSuQmCC>

[image13]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAYCAYAAAC8/X7cAAADAklEQVR4Xu2XS8hOQRjH/0IRktxyS2RB7okoLCSxYGWhWGNh5Rqrs7GwkVAK9a0kkWxcNxRZsFOikEiEEDspPL9vZj4zcy5O3peFvl/9O987z5w5zzzzzDPzSf38fww3DckbO6Cj8Uab1pg2mmaZBqbmEgtMPaaRuaEDppou+GcrBphWmu6Zrpo2e90wPTEt/tU1YbLppml2bjDGmG6bfnh9Ms1Jekh7vS3olWmut60wXVKLwAw2HTI9V9lRbCflPr4wszHpI6Yia8/ZYPos52CRmnohCHdNM7N2xj9u2pe1J+DgCdNH05LMFiCNPsgNxqABovnYP5soTNvkovvIND6xSvNNp0yDsnZYJvfOtNwQ2G767p91jDLdNz2US4sAkbms5s02zHRaLsoEgFXYlPRwqbozawuEb9OnxAzTa1VHJSYM8sI0wbfhNM4fCJ1qmC4XXfoTza+ma6ahUR/Sd3n0O4cAnFG6+r0UchE5mLXn4MQbpRPgye/1oVMN60x7/N84jfNMgskAwTmn5gCy0hSDEXEjdfaWXPqsjg0VYKdfPMgi01s1Rw4KpeOTPgQt7Cf2F3uwKv8DBCkOXi8hgmxOBmniqMoVhAm89M86Qv5PitqINCnLhmZjNuV/gAmQAWRCH2ECpZllTJE7B94rrfVtJhDnf0whF5Ad+n3+AxP4Ilet+qCaUFWaJsAS75f72K7M1mYC1H/ezwnFgxS8rrSyVVGZQuTcWdM31UeAc4EDjIOM8yKG6OIEm7SOQtX7KxxQBIbrQlP+A2n2TBUbnZMVB3tUdnCV6Z3psNKSFwgryAFVxVi56M7LDZ5QUuvej6FU1543XB2eyt2Bwv2Hu9ADuUmUaq+HdibOBo8ZJzdWfL85pvKFkKBcVP3qB1gdVqnxOsHgVCJun+TbRNU7HkNJxFlq+d+CSkXVCudGV+Hafce0Njd0kS1yB12e4l2DSnNe1fukUwjQFdVfMrsCqcZVAbVJu7YwViFXvrs5biUs727T0tzQAfxHuFX/wPl+/oSfdmCStdDzDykAAAAASUVORK5CYII=>