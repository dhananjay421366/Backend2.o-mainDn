import jwt from 'jsonwebtoken';

// Middleware: Authenticate User
export const authenticate = (req, res, next) => {
  const token =
    req.cookies?.token ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    console.log('Received Token:', token); // Log the received token
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    console.log('Decoded token:', decoded); // Log the decoded token
    req.user = decoded; // Attach the user payload to the request
    next(); // Proceed to the next middleware
  } catch (error) {
    console.error('JWT verification error:', error.message);
    return res.status(400).json({ error: 'Invalid token.', message: error.message });
  }
};



export const authenticate_user = (req, res, next) => {
  const token = req.headers['authorization'];
  var a = token.slice(7);//when we request throw browser then directyly use token not a
  console.log('a');
  if (!a) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(a, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid token.' });
  }
};
