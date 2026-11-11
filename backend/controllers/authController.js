const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { readUsers, writeUsers } = require("../lib/usersStore");
const { readList } = require("../lib/addressValidation");

const { jwtSecret: JWT_SECRET } = require("../lib/config");

// The token carries the role so role checks never need to read the user file
const signToken = (user) =>
  jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, {
    expiresIn: "24h",
  });

// Registrar un nuevo usuario
exports.signup = async (req, res) => {
  try {
    const { email, password, name, countryId } = req.body;
    let { communityId, provinceId } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const country = readList("countries.json", "countries").find(
      (c) => c.id === countryId
    );
    if (!country) {
      return res.status(400).json({ message: "Choose a country from the list" });
    }

    // Only Spain has communities and provinces
    if (country.isoCode === "ES") {
      if (!communityId) {
        return res.status(400).json({ message: "Community ID is required" });
      }

      if (!provinceId) {
        return res.status(400).json({ message: "Province ID is required" });
      }
    } else {
      communityId = undefined;
      provinceId = undefined;
    }

    const users = readUsers();

    // Verificar si el usuario ya existe
    const existingUser = users.find((user) => user.email === email);
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Encriptar la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Crear nuevo usuario
    // The role is never read from the request: signup always makes a
    // Customer, and only the seed creates the Admin.
    const newUser = {
      id: crypto.randomUUID(),
      name: name || email.split("@")[0],
      email,
      password: hashedPassword,
      role: "customer",
      countryId,
      communityId,
      provinceId,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);

    if (writeUsers(users)) {
      // Crear y devolver token
      const token = signToken(newUser);

      // No devolver la contraseña
      const { password, ...userWithoutPassword } = newUser;

      res.status(201).json({
        message: "User registered successfully",
        user: userWithoutPassword,
        token,
      });
    } else {
      res.status(500).json({ message: "Failed to register user" });
    }
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// The sign-in response, shared with the demo sign-in
const sendSession = (res, user) => {
  const { password, ...userWithoutPassword } = user;
  res.json({
    message: "User logged in successfully",
    user: userWithoutPassword,
    token: signToken(user),
  });
};
exports.sendSession = sendSession;

// Iniciar sesión
exports.signin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    // Buscar usuario
    const user = readUsers().find((user) => user.email === email);
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Verificar contraseña
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    sendSession(res, user);
  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Para uso en middleware de autenticación
exports.JWT_SECRET = JWT_SECRET;
