import User from '../models/user.model.js';
import { generateToken } from '../utils/generateToken.js';

export const registerUser = async (userData) => {
    const { name, email, password, role } = userData;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
        throw new Error('User already exists');
    }

    // Create user
    const user = await User.create({
        name,
        email,
        password,
        role
    });

    if (user) {
        return {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id, user.role),
        };
    } else {
        throw new Error('Invalid user data received');
    }
};

export const loginUser = async (email, password) => {
    // Check for user email explicitly selecting the password since by default it's unselected
    const user = await User.findOne({ email }).select('+password');

    if (user && (await user.matchPassword(password))) {
        // Check if user is active
        if (!user.isActive) {
            throw new Error('User account is deactivated');
        }
        return {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id, user.role),
        };
    } else {
        throw new Error('Invalid email or password');
    }
};
