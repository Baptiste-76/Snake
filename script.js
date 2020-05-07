window.onload = () => {
    let width = (window.innerWidth > 0) ? window.innerWidth : screen.width;
    let height = (window.innerHeight > 0) ? window.innerHeight : screen.height;
    let portrait = (window.innerHeight > window.innerWidth) ? true : false;

    let context, delay, snakee, apple, score, timeout, difficulty, isOnBreak, canvasWidth, canvasHeight, blockSize;

    if (width > 1919) {        
        // Taille du canevas (largeur puis hauteur) en pixels.
        canvasWidth = 900;
        canvasHeight = 600;
        // Dimensions d'un bloc exprimé en pixels.
        blockSize = 30;
    } else if (width > 1020) {
        canvasWidth = 680;
        canvasHeight = 400;
        blockSize = 20;
    }

    // Taille du canevas exprimée en Blocks (largeur puis hauteur).
    let widthInBlocks = canvasWidth / blockSize;
    let heightInBlocks = canvasHeight / blockSize;
    // Compteur de pommes avalées par le serpent.
    let applesCounter = 0;

    // On initialise le meilleur score à 0 ou au meilleur score sauvegardé dans le localStorage s'il y en a un.
    let highScore =  document.querySelector('#high-score');
    if (localStorage.getItem('high-score')) {
        highScore.textContent = localStorage.getItem('high-score');
    } else {
        highScore.textContent = 0;
    }

    // A chaque clique sur un bouton de difficulté, on enlève la classe "active" du bouton actuellement actif et on l'ajoute au bouton qui vient dêtre cliqué. On appelle ensuite la fonction setDifficulty().
    let buttons = document.querySelectorAll('.difficulty');
    for (const button of buttons) {
        button.addEventListener('click', () => {
            document.querySelector('.active').classList.remove("active");
            button.classList.add("active");
            setDifficulty();
        })
    }

    // Classe Snake qui représentera notre serpent.
    class Snake {
        // Fonction "Constructeur" de la classe Serpent. 
        // snakeBody sera materialisé par un tableau qui contient lui même des tableaux correspondant aux cases occupées par le serpent (avec pour chaque case un X et un Y)
        // direction représente la direction dans laquelle va le serpent (parmi gauche, droite, haut ou bas). Par défaut se positionne à "droite".
        // ateApple est un bouléen qui renvoit true si le serpent vient de manger une pomme. Est à false par défaut.
        constructor(snakeBody, direction) {
            this.snakeBody = snakeBody;
            this.direction = direction;
            this.ateApple = false;
        }
    
        // Fonction qui permet de dessiner le serpent (on utilise save() et restore() sur le contexte d'un canevas pour ne pas perdre l'état du canevas entre chaque ajout de dessin).
        draw() {
            context.save();
            // Pour chaque élément de snakeBody (chaque case), on appelle la fonction drawBlock() qui sera chargée de dessiner le serpent.
            for (let i = 0; i < this.snakeBody.length; i++) {
                drawBlock(context, this.snakeBody[i])
            }
            context.restore();
        }
    
        // Fonction qui permet de faire avancer le serpent.
        advance() {
            // On copie dans une variable nextPosition la valeur de la case correspondant actuellement à la tête du serpent (la case à l'indice 0 du tableau snakeBody).
            let nextPosition = this.snakeBody[0].slice();

            // En fonction de la direction actuelle du serpent, on ajoute (si position = droite ou bas) ou soustrait (si position = gauche ou haut) 1 à l'abscisse (nextPosition[0]) ou l'ordonnée (nextPosition[1]) de notre variable nextPosition.
            switch (this.direction) {
                case "left":
                    nextPosition[0] -= 1;
                    break;

                case "right":
                    nextPosition[0] += 1;
                    break;

                case "up":
                    nextPosition[1] -= 1;
                    break;

                case "down":
                    nextPosition[1] += 1;
                    break;

                // Si erreur, on renvoit un message.
                default:
                    throw("Invalid Direction");
            }

            // On ajoute à notre snakeBody la position de cette nouvelle case qui vient d'être modifiée.
            this.snakeBody.unshift(nextPosition);

            // Si le serpent ne vient pas de manger une pomme, on enlève à notre snakeBody la dernière case (correspondant à son ancienne queue). 
            if (!this.ateApple) {
                this.snakeBody.pop();
            } else {
                // Sinon, s'il vient de manger une pomme, on remet la variable ateApple à false (pour que la prochaine pomme qui sera mangée soit considérée). De plus, on ne supprime pas la dernère case de notre snakeBody afin que le serpent s'allonge bel et bien au fur et à mesure qu'il mange des pommes.
                this.ateApple = false;
            }
        }

        // Fonction qui permet de modifier la direction vers laquelle va le serpent. Prend en paramètre une nouvelle direction (parmi gauche, droite, haut ou bas).
        setDirection(newDirection) {
            // On crée tout d'abord une variable qui recensera dans un tableau les directions autorisées en fonction de l'orientation actuelle du serpent.
            let allowedDirections;

            // Pour cela, on utilise un switch qui "surveille" la direction actuelle du serpent (uniquement si le jeu n'est pas en pause).
            if (!isOnBreak) {                
                switch (this.direction) {
                    // Si celui-ci va actuellement à gauche ou à droite, il ne sera autorisé à aller qu'en haut ou en bas.
                    case "left":
                    case "right":
                        allowedDirections = ["up", "down"];
                        break;
    
                    // Si celui-ci va actuellement en haut ou en bas, il ne sera autorisé à aller qu'à gauche ou à droite.
                    case "up":
                    case "down":
                        allowedDirections = ["left", "right"];
                        break;
    
                    // Si erreur, on renvoit un message.
                    default:
                        throw("Invalid Direction");
                }
                
                // On cherche alors dans le tableau des directions autorisées si on trouve la valeur de la nouvelle direction. Si oui, indexOf(newDirection) renverra 0 ( pour haut ou gauche) ou 1 ( pour bas ou droite). Sinon, il ne trouvera pas newDirection dans le tableau et renverra donc -1. Si et seulement si la valeur est trouvée alors la nouvelle direction sera prise en compte.
                if (allowedDirections.indexOf(newDirection) > -1) {
                    this.direction = newDirection;
                }
            }
        }

        // Fonction qui sert à vérifier si le serpent rentre dans un mur ou dans son propre corps.
        checkCollision()  {
            // Par défaut, ces deux cas possibles de collision sont à false.
            let wallColision = false;
            let snakeCollision = false;

            // On isole la position de la tête du serpent (snakeBody[0]) dans une variable.
            let snakeHead = this.snakeBody[0];

            // On met dans deux variables différentes la valeur de l'abscisse et de l'ordonnée de cette tête.
            let xSnakeHead = snakeHead[0];
            let ySnakeHead = snakeHead[1];

            // On isole le reste du corps du serpent dans une autre variable (slice() copie le tableau mentionné à partir de l'index indiqué (ici 1) pour prendre tout le serpent sauf la tête qui est à l'index 0).
            let snakeBodyRest = this.snakeBody.slice(1);

            // On détermine les abscisses et ordonnées maximums que la tête ne doit pas dépasser pour rester dans le canevas (= cadre du jeu).
            let minX = 0;
            let minY = 0;
            let maxX = widthInBlocks - 1;
            let maxY = heightInBlocks - 1;

            // Si l'abscisse de la tête du serpent est inférieure à 0 ou supérieure à l'abscisse d'un des blocs les plus à droite du terrain de jeu, cela veut dire que le serpent sort du canevas par la gauche ou la droite.
            let snakeHeadOutsideVerticalWalls = xSnakeHead < minX || xSnakeHead > maxX;
            // Si l'ordonnée de la tête du serpent est inférieure à 0 ou supérieure à l'ordonnée d'un des blocs les plus en bas du terrain de jeu, cela veut dire que le serpent sort du canevas par le haut ou le bas.
            let snakeHeadOutsideHorizontalWalls = ySnakeHead < minY || ySnakeHead > maxY;

            // Si l'une des deux possibilités ci-dessus est vraie, alors le serpent est entré dans un mur.
            if (snakeHeadOutsideHorizontalWalls || snakeHeadOutsideVerticalWalls) {
                wallColision = true;
            }

            // Pour chaque case qui compose le corps du serpent (hormis la tête), on vérifie que les coordonnées de la tête ne sont pas identiques à celles de la case en question. Si c'est le cas, c'est que le serpent entre en collision avec son corps.
            for (let index = 0; index < snakeBodyRest.length; index++) {
                if (xSnakeHead === snakeBodyRest[index][0] && ySnakeHead === snakeBodyRest[index][1]) {
                    snakeCollision = true;
                }
            }

            // Enfin on retourne la collision si on en recontre une.
            return wallColision || snakeCollision;
        }

        // Fonction qui détermine si le serpent est en train de manger une pomme. Cette fonction prend en paramètre la position d'une pomme.
        isEatingApple(appleToEat) {
            // On isole une fois de plus la tête du serpent placée à l'index 0 de snakeBody.
            let snakeHead = this.snakeBody[0];

            // Si l'abscisse de la tête du serpent est égale à l'abscisse de la pomme et qu'il en est de même pour les ordonnées, alors le serpent mange la pomme. Sinon, c'est qu'il ne vient pas de passer sur une pomme.
            if (snakeHead[0] === appleToEat.position[0] && snakeHead[1]  === appleToEat.position[1]) {
                return true;
            } else {
                return false;
            }
        }
    }

    // Classe Apple qui représentera nos pommes.
    class Apple {
        // Fonction "Constructeur" de la classe Apple. Cette dernière n'est représentée que par une position.
        constructor(position) {
            this.position = position;
        }

        // Fonction qui permet de dessiner une pomme (cf plus haut pour les fonctions save() et restore()).
        draw() {
            context.save();
            // On choisit la couleur que prendra notre dessin.
            context.fillStyle = " #2cb978 ";
            // BeginPath() permet de remettre à 0 le dessin avant de dessiner une nouvelle pomme.
            context.beginPath();

            // On calcule le rayon d'une pomme (= la moitié d'un bloc).
            let radius = blockSize / 2;

            // On isole dans deux variables l'abscisse et l'ordonnée du centre du cercle (ex: position[0] renvoit l'abscisse de la pomme qu'on multiplie par la taille d'un bloc en pixel. Cela nous donne le point en haut à gauche de la case qui contiendra la pomme. Il faut donc lui ajouter la valeur du rayon de cette pomme pour en obtenir le centre).
            let xCenterCircle = this.position[0] * blockSize + radius;
            let yCenterCircle = this.position[1] * blockSize + radius;

            // On dessine la pomme. La fonction arc() permet de dessiner un arc de cercle en lui donnant dans l'ordre(x du centre, y du centre, rayon, angleDépart, angleFin, sensAntiHoraire).
            context.arc(xCenterCircle, yCenterCircle, radius, 0, Math.PI*2, true);
            // La fonction fill() remplit la pomme avec la couleur précédemment choisie.
            context.fill();
            context.restore();
        }

        // Fonction qui permet d'attribuer une nouvelle position à une pomme.
        setNewPosition() {
            // On prend un chiffre à virgule au hasard entre 0 et 1 grâce à Math.random() puis on le multiplie par le nombre de blocs dans le canevas - 1 (car l'index commence à 0). On arrondit ansuite ce chiffre à l'entier le plus proche grâce à Math.round(). On fait cela pour l'abscisse et l'ordonnée.
            let newAppleX = Math.round(Math.random() * (widthInBlocks - 1));
            let newAppleY = Math.round(Math.random() * (heightInBlocks - 1));

            // On attribue les valeurs calculées (abscisse et ordonnée) en tant que position de la nouvelle pomme.
            this.position = [newAppleX, newAppleY];
        }

        // Fonction qui permet de vérifier qu'une pomme qu'on vient de dessiner n'apparaîtra pas sur le serpent. Elle prend en paramètre un serpent.
        isOnSnake(snakeToCheck) {
            // La variable représentant cette erreur est par défaut à false.
            let isOnSnake = false;

            // Pour chaque case du corps du serpent, on vérifie que les coordonnées ne sont pas identiques à celles de la pomme. Si l'abscisse et l'ordonnée sont identiques, alors c'est que la pomme est sur le serpent (isOnSnake renvoit donc true). Sinon c'est qu'il n'y a pas d'erreur (isOnSnake renvoit false).
            for (let index = 0; index < snakeToCheck.snakeBody.length; index++) {
                if (this.position[0] === snakeToCheck.snakeBody[index][0] && this.position[1] === snakeToCheck.snakeBody[index][1]) {
                    isOnSnake = true;
                } 
            }
            return isOnSnake;
        }
    }

    // A chaque pression sur le clavier, on surveille quelle touche a été appuyée. Si c'est un touche de direction (parmi gauche, droite, haut ou bas), on attribut cette direction à la variable newDirection. Si c'est la touche ESPACE, on appelle la fonction restart() pour recommencer le jeu. Si c'est une autre touche, on ne fait rien.
    document.onkeydown = function handleKeyDown(event) {
        let key = event.keyCode;
        let newDirection;

        switch (key) {
            case 37:
                newDirection = "left";
                break;
        
            case 38:
                newDirection = "up";
                break;
        
            case 39:
                newDirection = "right";
                break;
        
            case 40:
                newDirection = "down";
                break;
        
            case 32:
                restart();
                return;

            case 80:
                pause();
                break;
                
            default:
                return;
        }

        // Si la touche appuyée est une touche de direction, on appelle ensuite la fonction setDirection() du serpent pour lui indiquer cette nouvelle direction.
        snakee.setDirection(newDirection);
    }

    // Fonction qui permet d'initialiser le jeu.
    function init() {
        // On appelle la fonction setDifficulty pour déterminer la difficulté (= vitesse de départ) du jeu.
        setDifficulty();

        // On met la variable jeuEnPause à false
        isOnBreak = false;

        // On crée un canevas (= surface de jeu) à qui on attribut une largeur, une hauteur, un style de bordures, des marges, un display block (pour le centrage), une couleur de fond. On ajoute ensuite celui-ci au HTML de notre page.
        let canvas = document.createElement('canvas');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        if (width > 1919) {
            canvas.style.border = "30px solid  #10182c";
        } else if (width > 1020) {
            canvas.style.border = "20px solid  #10182c";
        }

        canvas.style.margin = "0px auto";
        canvas.style.display = "block";
        canvas.style.backgroundColor = "#c2b178";
        document.querySelector('#canvasSection').appendChild(canvas);

        // On récupère le context du canevas dans une variable pour pouvoir dessiner à l'intérieur les pommes et le serpent. On choisit ici l'option 2d.
        context = canvas.getContext('2d');

        // On définit la couleur de notre futur serpent.
        context.fillStyle = "#63524a ";

        // On initialise un nouveau Serpent avec deux paramètres. Le premier est un tableau des différentes cases occupées par le serpent (tête + corps) au début du jeu. Le second représente la direction de départ du serpent.
        snakee = new Snake([
            [6, 4], [5, 4], [4, 4], [3, 4], [2, 4]
        ], "right");

        // On initialise une nouvelle pomme qui prend en paramètre d'entrée les coordonnées de la case dans laquelle elle se trouvera.
        apple = new Apple([10, 10]);

        // On initialise le score à 0.
        score = 0;

        // On appelle la fonction refreshCanvas() servant à rafraîchir l'environnement de jeu.
        refreshCanvas();
    }
    
    // Fonction qui permet de rafraîchir l'environnement de jeu.
    function refreshCanvas() {   
        // On fait avancer notre serpent.
        snakee.advance();

        // Si la fonction checkCollision renvoit true, c'est la fin du jeu. On appelle donc la focntion gameOver().
        if (snakee.checkCollision()) {
            gameOver();
        // Sinon, on vérifie si le serpent est en train de manger une pomme.
        } else {
            // Si oui, on passe la variable ateApple à true, on augmente le score de 1, on augmente le nombre de pommes mangées de 1. Enfin on initialise une nouvelle pomme (tant que cette pomme qui vient d'être créée se trouve sur le corps du serpent pour qu'une nouvelle pomme n'apparaisse pas sur le serpent).
            if (snakee.isEatingApple(apple)) {
                snakee.ateApple = true;

                score++;
                applesCounter++;

                do {
                    apple.setNewPosition();
                } while (apple.isOnSnake(snakee))
            }
            // Si c'est la 5ème pomme que le serpent mange, on augmente la vitesse du jeu en diminuant le délai entre chaque refresh du canevas. Puis on remet le compteur de pommes mangées à 0 pour que la vitesse du jeu puisse augmenter toutes les 5 pommes mangées.
            if (applesCounter == 5) {
                delay -= 5;
                applesCounter = 0;
            }
            // On efface l'ancien canevas. On définit pour ça le point de départ (en haut à gauche donc 0, 0) et le point d'arrivée de la zone à effacer (en bas à droite de la surface de jeu donc ici 900 pixels, 600 pixels).
            context.clearRect(0, 0, canvasWidth, canvasHeight);
    
            // On appelle en premier la fonction servant à dessiner le score afin que celui-ci soit en arrière-plan.
            drawScore();

            // On appelle ensuite la fonction draw() de nos classe Snake et Apple pour dessiner notre serpent et une pomme.
            snakee.draw();
            apple.draw();
            
            // Enfin, on appelle à nouveau la fonction refreshCanvas() à intervalles réguilers afin de rendre le jeu dynamique (= en mouvement). On met cet appel de fonction dans une variable timeout afin de pouvoir clear() le délai en cas de nouvelle partie (pour que les parties ne se superposent pas !).
            timeout = setTimeout(refreshCanvas, delay);
        }
    }

    // Fonction qui permet de dessiner un bloc (= une case occupée par le serpent). Elle prend en paramètre le contexte du canevas (pour pouvoir y dessiner) et les coordonnées du bloc à dessiner.
    function drawBlock(context, position) {
        // On calcule l'abscisse (position[0]) et l'ordonnée (position[1]) du bloc à dessiner, exprimées en pixels (* blockSize).
        let x = position[0] * blockSize;
        let y = position[1] * blockSize;

        // Puis on dessine ce bloc grâce à la fonction fillRect() qui prend 4 paramètres d'entrée (x du point d'origine, y du point d'origine, largeur, hauteur). Cette fonction permet donc de dessiner des rectangles ou, comme ici, des carrés.
        context.fillRect(x, y, blockSize, blockSize);
    }

    // Fonction appellé à la fin du jeu
    function gameOver() {
        context.save();

        // On choisit pour le texte qu'on souhaite écrire une couleur, une police ainsi que sa taille et son épaisseur, une couleur pour les bordures, ainsi que leur épaisseur. On choisit l'alignement horizontal du texte ainsi que la ligne de base à utiliser pour le futur texte (middle pour le centrer verticalement).
        context.fillStyle = "#f5f5f5";

        if (width > 1919) {
            context.font = "bold 70px sans-serif";
        } else if (width > 1020) {
            context.font = "bold 30px sans-serif";
        }

        context.strokeStyle = "black";
        context.lineWidth = 5;
        context.textAlign = "center";
        context.textBaseline = "middle";

        // On isole dans deux variables l'abscisse et l'ordonnée du centre du canevas (= surface de jeu).
        let centerX = canvasWidth / 2;
        let centerY = canvasHeight / 2;

        if (width > 1919) {
            // Puis on ajoute la bordure du texte voulue (1er paramètre) à la position voulue (2nd et 3ème paramètre).
            context.strokeText("Game Over", centerX, centerY + 100);
            // Puis on fait pareil avec le texte en lui même. Ici le texte et sa bordure seront donc centrés horizontalement et à 100 pixels sous le centre vertical.
            context.fillText("Game Over", centerX, centerY + 100);
        } else if (width > 1020) {
            context.strokeText("Game Over", centerX, centerY + 80);
            context.fillText("Game Over", centerX, centerY + 80);
        }

        // On peut modifier la taille du texte et ne rien changer aux autres paramètres afin d'écrire une ligne en plus petit. La valeur centerY + 160 aura pour conséquence d'écrire encore un peu plus bas que la ligne précédente.
        if (width > 1919) {
            context.font = "bold 30px sans-serif";
            context.strokeText("Appuyez sur la touche ESPACE pour rejouer !", centerX, centerY + 160);
            context.fillText("Appuyez sur la touche ESPACE pour rejouer !", centerX, centerY + 160);
        } else if (width > 1020) {
            context.font = "bold 20px sans-serif";
            context.strokeText("Appuyez sur la touche ESPACE pour rejouer !", centerX, centerY + 120);
            context.fillText("Appuyez sur la touche ESPACE pour rejouer !", centerX, centerY + 120);
        }

        // Toujours la même logique.
        if (width > 1919) {
            context.font = "bold 70px sans-serif";
            context.fillText("😫", centerX, centerY + 240);
        } else if (width > 1020) {
            context.font = "bold 30px sans-serif";
            context.fillText("😫", centerX, centerY + 160);
        }

        context.restore();

        // On met dans une variable le span servant à écrir le meilleur score.
        let highScore =  document.querySelector('#high-score');

        // Si le score qui vient d'être fait est supérieur au meilleur score, alors on remplace ce dernier par ce nouveau score. On l'enregistre aussi dans le stockage local afin de pouvoir le récupérer plus tard (si les paramètres de confidentialités du navigateur le permettent).
        if (highScore.textContent < score) {
            highScore.textContent = score;
            localStorage.setItem("high-score", score);
        }
    }

    // Fonction qui permet de relancer une nouvelle partie
    function restart() {
        // On remet les coordonnées du serpent comme au départ.
        snakee = new Snake([
            [6, 4], [5, 4], [4, 4], [3, 4], [2, 4]
        ], "right");

        // Idem pour les coordonnées de la première pomme.
        apple = new Apple([10, 10]);

        // On remet à 0 le score, le compteur de pommes mangées, le délai de refresh du canevas, la difficulté.
        score = 0;
        applesCounter = 0;
        clearTimeout(timeout);
        setDifficulty();

        // Puis on appelle la fonction qui refresh le canevas.
        refreshCanvas();
    }

    // Fonction qui permet de mettre le jeu en pause
    function pause() {
        if (!isOnBreak) {
            isOnBreak = true;
            clearTimeout(timeout);
        } else {
            isOnBreak = false;
            timeout = setTimeout(refreshCanvas, delay);
        }
    }

    // Fonction qui permet de dessiner le score actuel.
    function drawScore() {
        context.save();

        // On sélectionne la couleur du score, sa police ainsi que la taille et l'épaisseur de cette dernière, son alignement horizontal, puis  enfin son alignement vertical.
        context.fillStyle = "rgba(255, 255, 255, 0.5";
        context.font = "bold 200px sans-serif";
        context.textAlign = "center";
        context.textBaseline = "middle";

        // On isole dans deux variables l'abscisse et l'ordonnée du centre du canevas (= surface de jeu).
        let centerX = canvasWidth / 2;
        let centerY = canvasHeight / 2;

        // On transforme le score (integer) en texte (string) et on le fait apparaître sur le canevas grâce à la fonction fillText(). Celle ci prend 3 paramètres (texteAInserer, positionX, positionY).
        context.fillText(score.toString(), centerX, centerY);

        context.restore()
    }

    // Fonction qui permet de modifier la difficulté (= rapidité de départ) du jeu.
    function setDifficulty() {
        // On récupère dans une variable le texte correspondant au bouton sélectionné (et donc à la difficulté choisie).
        difficulty = document.querySelector('.active').textContent;

        // Selon cette difficulté, on modifie le délai de rafraîchissement du canevas et ainsi donc la rapidité de départ du jeu.
        switch (difficulty) {
            case "Facile":
                delay = 150;
                break;

            case "Moyen":
                delay = 100;
                break;

            case "Difficile":
                delay = 50;
                break;

            default:
                return;
        }
    }

    // On isole le bouton qui sert à commencer une première partie.
    let start = document.querySelector(".start");

    // Au clic sur celui-ci, on le désactive (pour empecher une nouvelle partie de commencer en même temps que la première). Puis on appelle la fonction init() pour établir l'environnement de jeu.
    start.addEventListener('click', () => {
        start.setAttribute("disabled", "disabled");
        init()
    });
}