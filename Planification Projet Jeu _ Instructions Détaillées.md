# **DIRECTIVE TECHNIQUE ET STRATÉGIQUE : PROJET ABYCE**

## **Architecture Haute Performance pour Simulation Systémique en Environnement Web**

### **Introduction : Le Mandat du CTO et la Vision Stratégique**

En ma qualité de Directeur Technique (CTO) pilotant l'initiative ABYCE, ce document constitue le socle fondamental et la doctrine technique qui régira l'intégralité du cycle de développement. Notre ambition est de briser le plafond de verre qui limite traditionnellement les jeux par navigateur aux expériences causales ou techniquement simplistes. Le projet ABYCE vise à répliquer la complexité systémique, la profondeur procédurale et la fluidité d'un titre AAA tel que *Spore* (phases cellulaire et aquatique), le tout au sein d'un environnement d'exécution JavaScript/TypeScript standardisé.

Cette ambition impose une rupture radicale avec les paradigmes de développement web conventionnels. Là où une application web classique (SaaS, E-commerce) tolère des latences de 50 à 100 millisecondes pour le traitement du DOM (Document Object Model), une simulation physique temps réel tournant à 60 images par seconde ne dispose que de 16,6 millisecondes par cadre pour effectuer l'intégralité de ses calculs (Input, AI, Physique, Rendu). Dans ce contexte, la moindre allocation mémoire superflue déclenchant le Garbage Collector (GC) devient un vecteur d'échec critique.1

Ma stratégie repose sur une approche hybride "Homme-Machine" rigoureuse. Nous utiliserons l'agent IA Jules (Google) pour accélérer la production du code "boilerplate" et des systèmes logiques, mais nous ne lui laisserons aucune latitude architecturale. Les modèles de langage (LLM) ont une tendance naturelle à converger vers les solutions les plus statistiquement présentes dans leur entraînement, à savoir le code Orienté Objet (OOP) classique et l'utilisation abusive de frameworks lourds. C'est pourquoi l'initialisation du projet via le "Prompt Maître" est l'étape la plus critique : elle doit agir comme un pare-feu architectural, interdisant les mauvaises pratiques avant même que la première ligne de code ne soit générée.

Ce rapport détaille les fondements théoriques de nos choix techniques (ECS, Zero-Allocation, No-Framework), analyse les risques inhérents à l'environnement JavaScript, et culmine avec la formulation du Prompt Maître destiné à l'agent Jules.

## ---

**1\. Analyse de l'Environnement d'Exécution : La Guerre contre le Garbage Collector**

Le développement de jeux haute performance en JavaScript est, par essence, une lutte contre la gestion automatique de la mémoire. Contrairement au C++ ou au Rust, où le développeur contrôle l'allocation et la libération des ressources (via malloc/free ou le modèle de propriété RAII), JavaScript délègue cette tâche au moteur d'exécution (V8 pour Chrome, SpiderMonkey pour Firefox).

### **1.1 Le Mécanisme de "Stop-the-World"**

Les moteurs JavaScript utilisent principalement un algorithme de "Mark-and-Sweep" pour nettoyer la mémoire. Lorsque le tas (heap) atteint un certain seuil d'occupation, le moteur suspend l'exécution du thread principal (celui qui fait tourner notre jeu) pour parcourir le graphe des objets, marquer ceux qui sont encore accessibles, et supprimer les autres. Cette pause, bien qu'optimisée dans les moteurs modernes (GC incrémentiel), reste imprévisible. Si notre boucle de jeu alloue des milliers de petits objets par seconde (vecteurs temporaires, instances de classes pour des particules, closures dans des fonctions callback), nous saturons la "Nursery" (l'espace mémoire des objets à vie courte). Cela force le GC à intervenir fréquemment, provoquant des micro-gels (stuttering) qui détruisent l'immersion et la réactivité des contrôles.2

| Type d'Allocation | Impact sur le GC | Fréquence admissible dans la Boucle de Jeu |
| :---- | :---- | :---- |
| const v \= new Vector3(x,y) | Élevé (Heap Allocation) | **INTERDIT** (0/frame) |
| .map(() \=\>...) | Critique (Tableaux \+ Closures) | **INTERDIT** (0/frame) |
| let x \= 10; | Nul (Stack / Registre) | Illimité |
| pool.get() | Faible (Réutilisation) | Recommandé |

### **1.2 La Philosophie "Zero-Allocation"**

Pour contrer ce phénomène, nous imposons une contrainte stricte de "Zero-Allocation" dans le *Hot Path* (la boucle de mise à jour critique). Cela signifie que :

1. **Réutilisation des Objets (Object Pooling) :** Aucune entité (cellule, projectile, bulle) n'est détruite. Elle est désactivée et renvoyée dans un tableau pré-alloué pour être réutilisée plus tard.4  
2. **Mutation In-Place :** Les opérations mathématiques ne doivent pas renvoyer de nouveaux objets. Au lieu de Vector.add(a, b) qui retourne un nouveau vecteur, nous utiliserons Vector.add(out, a, b) qui écrit le résultat dans un vecteur out pré-alloué.5  
3. **Bannissement des Méthodes Fonctionnelles :** Les méthodes comme .forEach, .filter, ou .map sont proscrites dans la boucle de rendu car elles génèrent des contextes d'exécution et des tableaux temporaires qui doivent être nettoyés ensuite.6

L'agent Jules, habitué au développement web moderne (souvent axé sur la lisibilité et l'immutabilité), tentera naturellement d'utiliser ces méthodes "propres" mais coûteuses. Le prompt doit explicitement inhiber ce comportement.

## ---

**2\. L'Architecture Mandataire : Entity Component System (ECS)**

Pour gérer la complexité d'une simulation biologique type *Spore* où chaque créature est un assemblage modulaire de parties (flagelles, bouches, pointes), l'Orienté Objet (OOP) est une impasse technique. L'héritage de classe devient rapidement ingérable (problème du diamant) et, plus grave, inefficace pour le processeur.

### **2.1 La Supériorité du Data-Oriented Design (DOD)**

Les processeurs modernes sont limités par la vitesse d'accès à la mémoire (RAM) plutôt que par la vitesse de calcul brute. Lorsqu'un CPU doit traiter des données, il charge des lignes de cache (Cache Lines).

* **Approche OOP :** Les données d'une entité (position, santé, sprite) sont encapsulées dans un objet. Si nous avons 1000 entités dispersées dans le tas mémoire, le CPU doit faire 1000 sauts aléatoires (Cache Misses) pour lire leurs positions. C'est inefficace.7  
* **Approche ECS :**  
  * **Entity :** Un simple ID (entier).  
  * **Component :** Un tableau de données brutes (TypedArray). Par exemple, toutes les positions X de toutes les entités sont stockées contiguës dans un Float32Array.  
  * **System :** Une fonction qui itère linéairement sur ces tableaux. Cette architecture permet au CPU de précharger les données efficacement (Prefetching), augmentant drastiquement les performances pour des simulations massives.9

### **2.2 Application au Gameplay "Spore-like"**

Le document de référence Analyse Jeu Spore... souligne l'importance de la morphologie procédurale.

* **Scénario :** Le joueur ajoute un "Jet de propulsion" à sa cellule.  
* **Implémentation ECS :** Cela revient simplement à attacher un ComponentPropulsion à l'entité du joueur. Le SystemMouvement détectera automatiquement la présence de ce composant et appliquera la force correspondante.  
* **Flexibilité :** Si demain nous voulons que les ennemis puissent aussi avoir des jets, il n'y a aucun code à changer. Le système traite toutes les entités possédant le composant requis de manière agnostique. C'est cette modularité extrême qui permettra à Jules de construire des systèmes complexes sans créer de dette technique ("Spaghetti Code").11

## ---

**3\. Stratégie de Pilotage de l'Agent IA (Jules)**

L'utilisation de Jules (Google) introduit une dynamique particulière. Bien que performant, un agent IA sans directives précises tend à halluciner des architectures incohérentes ou à mélanger des paradigmes incompatibles (ex: mélanger React state et boucle de jeu Canvas).

### **3.1 Le Protocole "Roadmap First"**

Il est impératif d'interdire à l'agent de coder immédiatement. Les LLM fonctionnent par prédiction de tokens. Si l'agent commence à écrire du code sans avoir "réfléchi" à la structure globale, il s'enfermera dans des choix initiaux médiocres. En exigeant la production d'un fichier ROADMAP.md en premier lieu, nous forçons l'agent à effectuer une "Chain of Thought" (Chaîne de Pensée) explicite. Il doit verbaliser son plan, découper les tâches et identifier les dépendances. Cela nous permet, en tant qu'architectes humains, de valider la direction avant tout investissement en temps de calcul.13

### **3.2 L'Utilisation du "Critique" Interne**

Jules dispose de mécanismes de révision (Critic-Augmented Generation). Pour activer ces mécanismes, le prompt doit utiliser un langage normatif fort ("INTERDICTION", "STRICT", "OBLIGATOIRE"). Si le prompt est une simple suggestion ("Essaie d'utiliser ECS"), l'agent peut prioriser la simplicité sur la performance. Si le prompt est une contrainte ("L'architecture ECS est OBLIGATOIRE"), le module critique de l'agent rejettera les solutions non conformes avant de nous les présenter.15

### **3.3 La Ségrégation UI vs Moteur**

Une erreur classique des développeurs web passant au jeu vidéo est de vouloir utiliser le DOM (HTML/CSS) pour les éléments de jeu. Or, manipuler le DOM est lent (Reflow/Repaint).

* **Directive :** Le moteur de jeu (Canvas/WebGL) est une boîte noire pour le navigateur.  
* **UI Overlay :** L'interface (menus, inventaire de pièces, éditeur de créature) sera gérée par React *au-dessus* du Canvas. Les deux mondes communiquent via un pont événementiel minimal, mais ne partagent jamais leur boucle de rendu. Le prompt doit clarifier cette frontière hermétique pour éviter que Jules n'essaie de rendre les cellules avec des \<div\>.16

## ---

**4\. Analyse des Références et Implications Techniques**

L'analyse des fichiers Analyse Jeu Spore Microbien & Sous-Marin.md et Project.md (tels que décrits dans le contexte) révèle des besoins spécifiques qui justifient nos choix architecturaux.

### **4.1 Physique des Fluides et Comportement Cellulaire**

La référence à la phase microbienne implique une physique particulière :

* **Friction Élevée (Viscosité) :** Contrairement à un jeu spatial, le mouvement s'arrête presque instantanément sans poussée.  
* **Dynamique des Corps Mou (Soft Body) :** Idéalement, les cellules devraient se déformer. Bien que complexe en 2D rigide, nous pouvons simuler cela via des animations procédurales dans le RenderSystem sans impacter la physique.  
* **Implication pour Jules :** Le ROADMAP.md doit prévoir une phase spécifique pour le "Tuning Physique" (ajustement des coefficients de friction et de restitution) séparée de l'implémentation de base.17

### **4.2 L'Éditeur de Créature**

C'est le cœur de l'expérience *Spore*.

* **Défi Technique :** Comment passer du mode "Jeu" (ECS, Temps Réel) au mode "Éditeur" (UI React, Statique)?  
* **Solution :** L'architecture doit supporter la sérialisation des entités. Une entité doit pouvoir être convertie en un JSON (Blueprints), modifiée par l'interface React, puis réhydratée en composants ECS. Le prompt doit insister sur la sérialisation des composants dès le départ.

## ---

**5\. Le Prompt Maître pour Jules**

Voici la formulation exacte du prompt, conçue pour être copiée-collée dans l'interface de l'agent. Il intègre toutes les contraintes de sécurité, de performance et d'architecture discutées ci-dessus. Il adopte un ton directif, professionnel et sans ambiguïté.

### ---

**PROMPT MAÎTRE (Copier ci-dessous)**

**RÔLE ET CONTEXTE**

Tu agis en tant que **Lead Core Engineer** (Expert Moteur & Architecture) au sein d'un studio AAA. Je suis ton CTO. Nous lançons le projet **'ABYCE'**, une simulation systémique de vie microbienne et aquatique s'inspirant mécaniquement de *Spore*, mais techniquement conçue pour tourner à 60 FPS constants dans un navigateur web moderne.

Ta mission est de structurer les fondations techniques du projet. Nous visons une qualité d'ingénierie "Industrial Grade", loin des standards habituels du développement web rapide.

**ÉTAPE 1 : ANALYSE ET PLANIFICATION (SANS CODAGE)**

Je t'ordonne formellement de ne **PAS** générer de code d'implémentation pour le moment. Toute tentative de coder immédiatement sera considérée comme une erreur critique.

Tes instructions sont les suivantes :

1. **Ingestion du Contexte :** Analyse en profondeur les deux fichiers présents dans le dépôt :  
   * Analyse Jeu Spore Microbien & Sous-Marin.md (pour comprendre les boucles de gameplay, la physique des fluides attendue et le système d'assemblage de créatures).  
   * Project.md (pour le périmètre global et les livrables).  
2. **Production du Livrable :** Génère un fichier unique nommé ROADMAP.md à la racine du projet. Ce fichier servira de boussole pour tout le développement futur.

**CONTRAINTES TECHNIQUES ABSOLUES (NON NÉGOCIABLES)**

L'architecture que tu vas définir dans la Roadmap doit respecter impérativement les dogmes suivants. Si la roadmap suggère des solutions contraires, elle sera rejetée.

* **Architecture : ECS (Entity Component System) Pur.**  
  * Utilisation stricte du pattern ECS. Interdiction formelle de l'Orienté Objet classique pour les entités de jeu (pas de class Player extends Entity).  
  * Les **Données** (Components) et la **Logique** (Systems) doivent être totalement découplées.  
  * Les Entités ne sont que des ID.  
* **Gestion Mémoire : Philosophie "Zero-Allocation".**  
  * Le moteur doit être conçu pour éviter le Garbage Collection (GC) durant la boucle de jeu.  
  * **Object Pooling OBLIGATOIRE :** Toutes les entités dynamiques (projectiles, particules, nourriture, ennemis) doivent être pré-allouées et recyclées.  
  * Interdiction d'utiliser des méthodes générant des allocations temporaires dans le "Hot Path" (.map, .filter, new Vector3 à chaque frame).  
* **Stack Technologique & Frameworks.**  
  * Langage : **TypeScript** (Configuration strict: true).  
  * Rendu : **Canvas API** (2D) encapsulée dans des systèmes de rendu, ou WebGL bas niveau si nécessaire pour les shaders.  
  * **INTERDICTION** d'utiliser React, Vue ou Angular pour le rendu des éléments de jeu (Entities). Ces frameworks sont trop lents pour une simulation à 60Hz.  
  * *Exception :* React est autorisé (et recommandé) uniquement pour l'**UI Overlay** (Menus, HUD, Éditeur de créature) qui se superpose au Canvas.

**STRUCTURE REQUISE DU FICHIER ROADMAP.MD**

Le fichier doit découper le projet en phases logiques et séquentielles. Assure-toi que chaque phase valide techniquement la suivante :

* **Phase 1 : Setup & Core Engine (La Fondation).**  
  * Initialisation de l'environnement (Vite/TypeScript).  
  * Implémentation du cœur ECS (World, EntityIndex, ComponentArrays, SystemManager).  
  * Mise en place de la Boucle de Jeu (Game Loop) découplée de la logique de rendu (Fixed Timestep pour la physique).  
* **Phase 2 : Gameplay Cellulaire (Le Prototype).**  
  * Implémentation des systèmes de base : InputSystem, MovementSystem (avec friction/inertie fluide), RenderSystem.  
  * Création de la première entité "Cellule" jouable.  
  * Gestion de la caméra (suivi, zoom).  
* **Phase 3 : Systèmes "Spore-like" (La Complexité).**  
  * **Système d'Assemblage :** Logique permettant d'attacher des composants "Parts" (Flagelles, Bouches) à une entité et de recalculer ses stats (Vitesse, Attaque) dynamiquement.  
  * **Système de Consommation :** Détection de collision optimisée (Quadtree ou Spatial Hashing requis) pour manger la nourriture/cellules.  
  * **Croissance :** Scaling des entités et ajustement de la vue.  
* **Phase 4 : Polish, UI & Optimisation.**  
  * Intégration de l'interface React (Éditeur de créature).  
  * Shaders et Post-Processing (Distortion aquatique).  
  * Profiling mémoire et optimisation des pools.

**TON DE LA RÉPONSE**

Adopte le ton d'un Architecte Senior. Sois concis, technique et structuré. Ne m'explique pas ce qu'est l'ECS, montre-moi que tu as compris comment l'implémenter dans le plan.

Génère maintenant le fichier ROADMAP.md.

## ---

**6\. Justification Détaillée des Phases de la Roadmap**

Pour assurer la cohérence de la stratégie, voici une explication approfondie de chaque phase demandée dans le prompt, destinée à éclairer les choix du CTO.

### **Phase 1 : Core Engine et Rigueur de la Boucle**

La plupart des projets échouent car ils mélangent la logique de jeu et le rendu. En exigeant un "Fixed Timestep" dès la Phase 1, nous nous assurons que la physique de la simulation restera déterministe, peu importe le taux de rafraîchissement de l'écran du joueur (60Hz, 144Hz ou variable). C'est crucial pour la stabilité des collisions dans un jeu de fluides.6

### **Phase 2 : Le Gameplay Cellulaire "Nu"**

Avant d'ajouter la complexité des créatures modifiables, nous devons valider le "Game Feel". Le mouvement sous-marin est spécifique : il y a de l'inertie, de la dérive. Si nous ne capturons pas cette sensation avec une simple boule blanche (le prototype), aucun graphisme ne sauvera le jeu. Cette phase isole la variable "Physique" pour l'ajuster parfaitement.

### **Phase 3 : La Complexité Systémique**

C'est ici que l'ECS brille. L'ajout de "Parts" (parties du corps) dans *Spore* modifie les capacités de la créature.

* *Approche Classique :* Un cauchemar de if (hasWings) fly() et if (hasFins) swim().  
* *Approche ABYCE :* L'ajout d'une nageoire ajoute simplement un composant Hydrodynamics avec une valeur de poussée. Le système de physique fait la somme de tous les vecteurs de poussée. C'est propre, extensible et sans bug logique. La roadmap doit explicitement mentionner cette mécanique d'assemblage.12

### **Phase 4 : L'Optimisation Spatiale**

La détection de collision "Naïve" compare chaque entité à toutes les autres (complexité O(N²)). Avec 500 particules de nourriture et 20 ennemis, cela fait 270 000 vérifications par frame. C'est impossible en JS. Nous exigeons l'utilisation d'un **Quadtree** ou d'un **Spatial Hash Grid** dans la roadmap. Cela réduit la complexité à O(N log N) ou O(N), rendant la simulation fluide même avec des milliers d'objets. C'est une exigence non fonctionnelle critique.8

## ---

**7\. Conclusion et Perspectives**

Le développement du projet ABYCE est un défi d'ingénierie autant que de design. En refusant les facilités offertes par les frameworks web classiques et en imposant une discipline de fer sur la gestion mémoire, nous nous donnons les moyens de créer une expérience qui transcende les attentes habituelles pour un jeu par navigateur.

L'agent Jules, piloté par ce Prompt Maître, ne sera pas un simple générateur de code, mais un exécutant contraint par une architecture solide. Ce document marque la fin de la phase de conceptualisation et le début de la phase d'exécution. La balle est désormais dans le camp de l'IA, mais les règles du jeu ont été fixées par l'humain.

**Recommandation finale :** Une fois le ROADMAP.md généré par Jules, il devra être audité manuellement pour vérifier la présence explicite des stratégies de pooling et de partitionnement spatial avant d'autoriser le passage à l'écriture du code de la Phase 1\.

#### **Sources des citations**

1. Memory management \- JavaScript \- MDN Web Docs, consulté le février 18, 2026, [https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Memory\_management](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Memory_management)  
2. JavaScript Memory Management: Garbage Collection, Memory Leaks, and Performance Improvements | by Yunus Emre Salcan | Medium, consulté le février 18, 2026, [https://medium.com/@yunusemresalcan/javascript-memory-management-garbage-collection-memory-leaks-and-performance-improvements-f9fd8b933918](https://medium.com/@yunusemresalcan/javascript-memory-management-garbage-collection-memory-leaks-and-performance-improvements-f9fd8b933918)  
3. Memory Management in JS: The Silent Hero \- DEV Community, consulté le février 18, 2026, [https://dev.to/lovestaco/memory-management-in-js-the-silent-hero-4310](https://dev.to/lovestaco/memory-management-in-js-the-silent-hero-4310)  
4. Memory allocation patterns used in game development, consulté le février 18, 2026, [https://gamedev.stackexchange.com/questions/25782/memory-allocation-patterns-used-in-game-development](https://gamedev.stackexchange.com/questions/25782/memory-allocation-patterns-used-in-game-development)  
5. Pattern for no-allocation loops in JavaScript? \- Stack Overflow, consulté le février 18, 2026, [https://stackoverflow.com/questions/18421845/pattern-for-no-allocation-loops-in-javascript](https://stackoverflow.com/questions/18421845/pattern-for-no-allocation-loops-in-javascript)  
6. Building a Professional Game Loop in TypeScript: From Basic to Advanced Implementation, consulté le février 18, 2026, [https://dev.to/stormsidali2001/building-a-professional-game-loop-in-typescript-from-basic-to-advanced-implementation-eo8](https://dev.to/stormsidali2001/building-a-professional-game-loop-in-typescript-from-basic-to-advanced-implementation-eo8)  
7. Implementing an Entity Component System (ECS) in TypeScript: Design Tips and Performance Considerations? \- Reddit, consulté le février 18, 2026, [https://www.reddit.com/r/typescript/comments/1m9jh1v/implementing\_an\_entity\_component\_system\_ecs\_in/](https://www.reddit.com/r/typescript/comments/1m9jh1v/implementing_an_entity_component_system_ecs_in/)  
8. entity component system \- I don't get why ECS is considered more performant than OOP, consulté le février 18, 2026, [https://gamedev.stackexchange.com/questions/200076/i-dont-get-why-ecs-is-considered-more-performant-than-oop](https://gamedev.stackexchange.com/questions/200076/i-dont-get-why-ecs-is-considered-more-performant-than-oop)  
9. Why is Entity Component System (ECS) so awesome for game development? \- Medium, consulté le février 18, 2026, [https://medium.com/source-true/why-is-entity-component-system-ecs-so-awesome-for-game-development-f554e1367c17](https://medium.com/source-true/why-is-entity-component-system-ecs-so-awesome-for-game-development-f554e1367c17)  
10. Why build an ECS? Why TypeScript? \- Maxwell Forbes, consulté le février 18, 2026, [https://maxwellforbes.com/posts/typescript-ecs-why/](https://maxwellforbes.com/posts/typescript-ecs-why/)  
11. Building a game with TypeScript. Entities and Components | by Greg Solo | ITNEXT, consulté le février 18, 2026, [https://itnext.io/entity-component-system-in-action-with-typescript-f498ca82a08e](https://itnext.io/entity-component-system-in-action-with-typescript-f498ca82a08e)  
12. How to create a Spore-like game? \- Epic Developer Community Forums \- Unreal Engine, consulté le février 18, 2026, [https://forums.unrealengine.com/t/how-to-create-a-spore-like-game/442021](https://forums.unrealengine.com/t/how-to-create-a-spore-like-game/442021)  
13. Build with Jules, your asynchronous coding agent \- Google Blog, consulté le février 18, 2026, [https://blog.google/innovation-and-ai/models-and-research/google-labs/jules/](https://blog.google/innovation-and-ai/models-and-research/google-labs/jules/)  
14. Five Best Practices for Using AI Coding Assistants | Google Cloud Blog, consulté le février 18, 2026, [https://cloud.google.com/blog/topics/developers-practitioners/five-best-practices-for-using-ai-coding-assistants](https://cloud.google.com/blog/topics/developers-practitioners/five-best-practices-for-using-ai-coding-assistants)  
15. Meet Jules' sharpest critic and most valuable ally \- Google Developers Blog, consulté le février 18, 2026, [https://developers.googleblog.com/meet-jules-sharpest-critic-and-most-valuable-ally/](https://developers.googleblog.com/meet-jules-sharpest-critic-and-most-valuable-ally/)  
16. Build a Browser-Based Endless Runner Game in TypeScript: Step-by-Step Guide for Beginners \- Dev.to, consulté le février 18, 2026, [https://dev.to/m-a-h-b-u-b/build-a-browser-based-endless-runner-game-in-typescript-step-by-step-guide-for-beginners-4k4n](https://dev.to/m-a-h-b-u-b/build-a-browser-based-endless-runner-game-in-typescript-step-by-step-guide-for-beginners-4k4n)  
17. Thinking of making a 2d Spore-like game. But, which 2d to use? : r/gamedesign \- Reddit, consulté le février 18, 2026, [https://www.reddit.com/r/gamedesign/comments/7zwurq/thinking\_of\_making\_a\_2d\_sporelike\_game\_but\_which/](https://www.reddit.com/r/gamedesign/comments/7zwurq/thinking_of_making_a_2d_sporelike_game_but_which/)  
18. Performance tips for JavaScript Game Developers : r/incremental\_games \- Reddit, consulté le février 18, 2026, [https://www.reddit.com/r/incremental\_games/comments/mwx2xd/performance\_tips\_for\_javascript\_game\_developers/](https://www.reddit.com/r/incremental_games/comments/mwx2xd/performance_tips_for_javascript_game_developers/)