import bcrypt from 'bcrypt';

/**
 * Cria hash da senha
 * @param {string} password - Senha em texto puro
 * @returns {Promise<string>} - Hash da senha
 */
export const hashPassword = async (password) => {
    try {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        return hashedPassword;
    } catch (error) {
        throw new Error('Erro ao criar hash da senha: ' + error.message);
    }
};

/**
 * Compara senha com hash
 * @param {string} password - Senha em texto puro
 * @param {string} hashedPassword - Hash armazenado
 * @returns {Promise<boolean>} - True se corresponder
 */
export const comparePassword = async (password, hashedPassword) => {
    try {
        const isMatch = await bcrypt.compare(password, hashedPassword);
        return isMatch;
    } catch (error) {
        throw new Error('Erro ao comparar senhas: ' + error.message);
    }
};

export default {
    hashPassword,
    comparePassword
};