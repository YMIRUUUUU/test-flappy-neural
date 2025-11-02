// ============================================
// UTILITAIRES MATHÉMATIQUES PARTAGÉS
// ============================================

// Génération de nombres aléatoires gaussiens (Box-Muller transform)
function randomGaussian(mean = 0, std = 1) {
    let u = 0, v = 0;
    while(u === 0) u = Math.random();
    while(v === 0) v = Math.random();
    return mean + std * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Fonction sigmoïde
function sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
}

// Fonction sigmoïde dérivée
function sigmoidDerivative(x) {
    const s = sigmoid(x);
    return s * (1 - s);
}

// ============================================
// CLASSE NEURALNETWORK (RÉSEAU NEURONAL)
// ============================================
class NeuralNetwork {
    constructor(inputSize, hiddenSize, outputSize, mutationRate = 0.1, mutationStrength = 0.3) {
        this.inputSize = inputSize;
        this.hiddenSize = hiddenSize;
        this.outputSize = outputSize;
        this.mutationRate = mutationRate;
        this.mutationStrength = mutationStrength;

        // Initialisation des poids avec Xavier initialization
        this.weightsIH = this.randomMatrix(hiddenSize, inputSize, -1, 1);
        this.weightsHO = this.randomMatrix(outputSize, hiddenSize, -1, 1);
        this.biasH = this.randomMatrix(hiddenSize, 1, -1, 1);
        this.biasO = this.randomMatrix(outputSize, 1, -1, 1);
    }

    // Générer une matrice aléatoire
    randomMatrix(rows, cols, min, max) {
        const matrix = [];
        for (let i = 0; i < rows; i++) {
            matrix[i] = [];
            for (let j = 0; j < cols; j++) {
                const limit = Math.sqrt(2.0 / (rows + cols));
                matrix[i][j] = randomGaussian(0, limit);
            }
        }
        return matrix;
    }

    // Propagation avant (forward pass)
    predict(inputs) {
        // Couche input -> hidden
        const hidden = [];
        for (let i = 0; i < this.hiddenSize; i++) {
            let sum = this.biasH[i][0];
            for (let j = 0; j < this.inputSize; j++) {
                sum += inputs[j] * this.weightsIH[i][j];
            }
            hidden[i] = sigmoid(sum);
        }

        // Couche hidden -> output
        const outputs = [];
        for (let i = 0; i < this.outputSize; i++) {
            let sum = this.biasO[i][0];
            for (let j = 0; j < this.hiddenSize; j++) {
                sum += hidden[j] * this.weightsHO[i][j];
            }
            outputs[i] = sigmoid(sum);
        }

        return outputs;
    }

    // Copier le réseau neuronal
    copy() {
        const copy = new NeuralNetwork(this.inputSize, this.hiddenSize, this.outputSize, this.mutationRate, this.mutationStrength);
        copy.weightsIH = this.copyMatrix(this.weightsIH);
        copy.weightsHO = this.copyMatrix(this.weightsHO);
        copy.biasH = this.copyMatrix(this.biasH);
        copy.biasO = this.copyMatrix(this.biasO);
        return copy;
    }

    // Copier une matrice
    copyMatrix(matrix) {
        return matrix.map(row => [...row]);
    }

    // Mutation (ajout de bruit gaussien)
    mutate() {
        const mutateValue = (value) => {
            if (Math.random() < this.mutationRate) {
                return value + randomGaussian(0, this.mutationStrength);
            }
            return value;
        };

        for (let i = 0; i < this.hiddenSize; i++) {
            for (let j = 0; j < this.inputSize; j++) {
                this.weightsIH[i][j] = mutateValue(this.weightsIH[i][j]);
            }
        }

        for (let i = 0; i < this.outputSize; i++) {
            for (let j = 0; j < this.hiddenSize; j++) {
                this.weightsHO[i][j] = mutateValue(this.weightsHO[i][j]);
            }
        }

        for (let i = 0; i < this.hiddenSize; i++) {
            this.biasH[i][0] = mutateValue(this.biasH[i][0]);
        }

        for (let i = 0; i < this.outputSize; i++) {
            this.biasO[i][0] = mutateValue(this.biasO[i][0]);
        }
    }

    // Crossover (combinaison de deux réseaux)
    static crossover(parent1, parent2) {
        const child = new NeuralNetwork(
            parent1.inputSize,
            parent1.hiddenSize,
            parent1.outputSize,
            parent1.mutationRate,
            parent1.mutationStrength
        );

        child.weightsIH = child.crossoverMatrices(parent1.weightsIH, parent2.weightsIH);
        child.weightsHO = child.crossoverMatrices(parent1.weightsHO, parent2.weightsHO);
        child.biasH = child.crossoverMatrices(parent1.biasH, parent2.biasH);
        child.biasO = child.crossoverMatrices(parent1.biasO, parent2.biasO);

        return child;
    }

    // Crossover de matrices
    crossoverMatrices(matrix1, matrix2) {
        const result = [];
        for (let i = 0; i < matrix1.length; i++) {
            result[i] = [];
            for (let j = 0; j < matrix1[i].length; j++) {
                if (Math.random() < 0.5) {
                    result[i][j] = matrix1[i][j];
                } else {
                    result[i][j] = matrix2[i][j];
                }
            }
        }
        return result;
    }

    // Sérialiser pour sauvegarde
    serialize() {
        return {
            weightsIH: this.weightsIH,
            weightsHO: this.weightsHO,
            biasH: this.biasH,
            biasO: this.biasO,
            inputSize: this.inputSize,
            hiddenSize: this.hiddenSize,
            outputSize: this.outputSize,
            mutationRate: this.mutationRate,
            mutationStrength: this.mutationStrength
        };
    }

    // Désérialiser depuis sauvegarde
    static deserialize(data) {
        const network = new NeuralNetwork(data.inputSize, data.hiddenSize, data.outputSize, data.mutationRate, data.mutationStrength);
        network.weightsIH = data.weightsIH;
        network.weightsHO = data.weightsHO;
        network.biasH = data.biasH;
        network.biasO = data.biasO;
        return network;
    }
}

