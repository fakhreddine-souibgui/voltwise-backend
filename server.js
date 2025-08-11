const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql');
const cors = require('cors');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const multer = require('multer');
const path = require('path'); // pour bien gérer les chemins



const app = express();
// Middleware
app.use(express.json());
app.use(cors());
app.use('/uploads', express.static('uploads'));



require('dotenv').config();

// Connexion MySQL
/*const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'finaldb'
});*/
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

db.connect(err => {
  if (err) {
    console.error('Erreur de connexion à MySQL :', err);
    return;
  }
  console.log('Connecté à MySQL !');
});

// Configuration Nodemailer (Utilisation de Gmail)
/*const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'voltwises@gmail.com', // Remplace par ton email
    pass: 'dvhs vquo jbmg nqxb'  // Active "Less secure apps" ou utilise un App Password
  }
});*/
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

// API pour ajouter un utilisateur et envoyer un email avec un PDF
app.post('/api/formulaire', (req, res) => {
  const { nom, email, nomentreprise, fonction, tel, Gouvernorat, message } = req.body;
  
  if (!nom || !email || !nomentreprise || !fonction || !tel || !Gouvernorat || !message) {
    return res.status(400).json({ message: 'Tous les champs sont requis.' });
  }

  // Requête SQL pour insérer l'utilisateur
  db.query(
    "INSERT INTO utilisateurs (nom, email, nomentreprise, fonction, tel, Gouvernorat, message) VALUES (?, ?, ?, ?, ?, ?, ?)", 
    [nom, email, nomentreprise, fonction, tel, Gouvernorat, message], 
    (err, result) => {
      if (err) {
        console.error('Erreur MySQL :', err);
        return res.status(500).json({ error: 'Erreur lors de l’insertion.' });
      }

      // Génération du PDF
     /* const pdfPath = `./formulaire_${Date.now()}.pdf`;
      const doc = new PDFDocument();
      const stream = fs.createWriteStream(pdfPath);
      
      doc.pipe(stream);
      doc.fontSize(18).text('Confirmation d\'inscription', { align: 'center' });
      doc.moveDown();
      doc.fontSize(14).text(`Nom: ${nom}`);
      doc.text(`Email: ${email}`);
      doc.text(`Nom d'entreprise: ${nomentreprise}`);
      doc.text(`Fonction: ${fonction}`);
      doc.text(`Gouvernorat: ${Gouvernorat}`);
      doc.text(`Téléphone: ${tel}`);
      doc.text(`Message: ${message}`);
      doc.end();*/
      const pdfPath = `./formulaire_${Date.now()}.pdf`;
const doc = new PDFDocument({ margin: 50 });
const stream = fs.createWriteStream(pdfPath);

doc.pipe(stream);

// 🔷 En-tête
doc
  .fontSize(22)
  .fillColor('#2c3e50')
  .text('Voltwise Solutions', { align: 'center' });

doc
  .moveDown(0.5)
  .fontSize(16)
  .fillColor('#27ae60')
  .text('Confirmation d\'inscription', { align: 'center', underline: true });

doc.moveDown(2);

// 📄 Cadre informations
doc
  .lineWidth(1)
  .rect(doc.x, doc.y, 500, 220)
  .stroke('#bdc3c7');

doc.moveDown(1);

// ✅ Informations utilisateur
doc
  .fontSize(12)
  .fillColor('#000000')
  .text(`Nom complet : `, { continued: true })
  .fillColor('#34495e')
  .text(`${nom}`);

doc
  .fillColor('#000000')
  .text(`Email : `, { continued: true })
  .fillColor('#34495e')
  .text(`${email}`);

doc
  .fillColor('#000000')
  .text(`Nom d'entreprise : `, { continued: true })
  .fillColor('#34495e')
  .text(`${nomentreprise}`);

doc
  .fillColor('#000000')
  .text(`Fonction : `, { continued: true })
  .fillColor('#34495e')
  .text(`${fonction}`);

doc
  .fillColor('#000000')
  .text(`Gouvernorat : `, { continued: true })
  .fillColor('#34495e')
  .text(`${Gouvernorat}`);

doc
  .fillColor('#000000')
  .text(`Téléphone : `, { continued: true })
  .fillColor('#34495e')
  .text(`${tel}`);

doc
  .fillColor('#000000')
  .text(`Message :`, { underline: true })
  .fillColor('#2c3e50')
  .text(`"${message}"`, { indent: 20, lineGap: 4 });

doc.moveDown(3);

// ✍️ Signature / footer
doc
  .fontSize(10)
  .fillColor('#7f8c8d')
  .text('— Document généré automatiquement par Voltwise Solutions —', { align: 'center' });

doc.end();


      stream.on('finish', () => {
        // Envoi de l'email avec le PDF en pièce jointe
        const mailOptions = {
          from: email,
          to: 'voltwises@gmail.com',
          subject: 'Confirmation d\'inscription avec PDF',
          html: `
            <h2>Bonjour ${nom},</h2>
            <p>Merci pour votre inscription. Vous trouverez en pièce jointe un récapitulatif de vos informations.</p>
            <p>Cordialement,</p>
            <p>Votre équipe</p>
          `,
          attachments: [
            {
              filename: `formulaire_${nom}.pdf`,
              path: pdfPath
            }
          ]
        };

        transporter.sendMail(mailOptions, (error, info) => {
          // Suppression du fichier PDF après envoi
          fs.unlinkSync(pdfPath);

          if (error) {
            console.error('Erreur lors de l\'envoi de l\'email :', error);
            return res.status(500).json({ error: 'Utilisateur ajouté, mais échec de l\'envoi de l\'email.' });
          }
          
          console.log('Email envoyé :', info.response);
          res.json({ 
            id: result.insertId, 
            nom, email, nomentreprise, fonction, tel, Gouvernorat, message, 
            message: 'Utilisateur ajouté et email avec PDF envoyé !' 
          });
        });
      });
    }
  );
});

  app.get('/api/demandes', (req, res) => {
    const page = parseInt(req.query.page) || 1;  // Page actuelle (par défaut 1)
    const limit = 8;  // Nombre d’utilisateurs par page
    const offset = (page - 1) * limit;
  
    db.query("SELECT * FROM utilisateurs LIMIT ? OFFSET ?", [limit, offset], (err, results) => {
      if (err) {
        console.error('Erreur MySQL:', err);
        return res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
      }
      res.json(results);
    });
  });
  
  
  
  app.delete('/api/demandes/:id', (req, res) => {
    const { id } = req.params;

    // Vérifier si l'ID est bien défini
    if (!id) {
        return res.status(400).json({ message: "ID requis" });
    }

    // Supprimer la demande de la base de données
    db.query("DELETE FROM utilisateurs WHERE id = ?", [id], (err, result) => {
        if (err) {
            console.error('Erreur MySQL:', err);
            return res.status(500).json({ error: 'Erreur lors de la suppression' });
        }
        
        // Vérifier si une ligne a été affectée (sinon, l'ID n'existe pas)
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Demande non trouvée" });
        }

        res.status(200).json({ message: "Demande supprimée avec succès" });
    });
});

  app.put('/api/demandes/:id', (req, res) => {
    const { id } = req.params;
    const updatedData = req.body;
  
    if (!updatedData || Object.keys(updatedData).length === 0) {
      return res.status(400).json({ message: "Données manquantes." });
    }
  
    db.query(
      "UPDATE utilisateurs SET ? WHERE id = ?",
      [updatedData, id],
      (err, result) => {
        if (err) {
          console.error('Erreur MySQL:', err);
          return res.status(500).json({ error: 'Erreur serveur' });
        }
  
        if (result.affectedRows === 0) {
          return res.status(404).json({ message: "Demande non trouvée." });
        }
  
        res.status(200).json({ message: "Demande mise à jour avec succès." });
      }
    );
  });
  
  
  app.post('/api/reservation', (req, res) => {
    const { name, email, phone, date } = req.body;
  
    if (!name || !email || !phone || !date) {
      return res.status(400).json({ message: 'Tous les champs sont requis.' });
    }
  
    const sql = "INSERT INTO reservations (name, email, phone, demo_date) VALUES (?, ?, ?, ?)";
    db.query(sql, [name, email, phone, date], (err, result) => {
      if (err) {
        console.error('Erreur MySQL :', err);
        return res.status(500).json({ error: 'Erreur lors de l’enregistrement de la démo.' });
      }
  
      res.status(201).json({ message: 'Réservation de démo enregistrée avec succès !' });
    });
  });

  // API pour récupérer toutes les réservations
app.get('/api/reservations', (req, res) => {
    db.query('SELECT * FROM reservations', (err, result) => {
      if (err) throw err;
      res.json(result);
    });
  });
  // registre

  // Inscription utilisateur avec mot de passe
app.post('/api/signup', async (req, res) => {
  const { fullName, email, password, companyName, job, governorate, city, phone } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ message: 'Champs requis manquants.' });
  }

  // Vérifier si l'utilisateur existe déjà
  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
    if (err) return res.status(500).json({ error: 'Erreur base de données.' });
    if (results.length > 0) return res.status(409).json({ message: 'Email déjà utilisé.' });

    const hashedPassword = await bcrypt.hash(password, 10);

    db.query("INSERT INTO users (fullName, email, password, companyName, job, governorate, city, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", 
      [fullName, email, hashedPassword, companyName, job, governorate, city, phone],
      (err, result) => {
        if (err) return res.status(500).json({ error: 'Erreur lors de l’insertion.' });
        res.status(201).json({ message: 'Inscription réussie !' });
      }
    );
  });
});


// Connexion utilisateur
app.post('/api/signin', (req, res) => {
  const { email, password } = req.body;

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
    if (err) return res.status(500).json({ error: 'Erreur base de données.' });
    if (results.length === 0) return res.status(401).json({ message: 'Utilisateur non trouvé.' });

    const user = results[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ message: 'Mot de passe incorrect.' });

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '1h'
    });

    res.json({ message: 'Connexion réussie', token });
  });
});

/*function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // Token invalide ou expiré
    req.user = user;
    next();
  });
}*/
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ message: 'Token manquant' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Token invalide ou expiré' });
    }

    req.user = user;
    next();
  });
}

/*app.get('/api/profile', authenticateToken, (req, res) => {
  res.json({ message: 'Accès autorisé', user: req.user });
});*/
// Récupérer l'espace client de l'utilisateur après l'authentification
app.get('/api/me', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.query("SELECT fullName, email, companyName, job, governorate, city, phone FROM users WHERE id = ?", [userId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Erreur base de données.' });

    if (results.length === 0) return res.status(404).json({ message: 'Utilisateur introuvable.' });

    const user = results[0];
    res.json({ message: 'Informations utilisateur récupérées avec succès.', user });
  });
});
/*compteclient profile */

app.post('/api/stations', authenticateToken, (req, res) => {
  const { reference, espace, adresse, date_installation } = req.body;
  const user_id = req.user.id; // Utilise l'id depuis le token

  if (!reference || !espace || !adresse || !date_installation) {
    return res.status(400).json({ message: 'Tous les champs sont requis.' });
  }

  db.query(
    'INSERT INTO stations (reference, espace, adresse, date_installation, user_id) VALUES (?, ?, ?, ?, ?)',
    [reference, espace, adresse, date_installation, user_id],
    (err, result) => {
      if (err) {
        console.error('Erreur SQL :', err);
        return res.status(500).json({ error: 'Erreur lors de l’ajout de la station.' });
      }
      res.status(201).json({ message: 'Station ajoutée avec succès.', id: result.insertId });
    }
  );
});

app.get('/api/stations', authenticateToken, (req, res) => {
  const userId = req.user.id;
  db.query('SELECT * FROM stations WHERE user_id = ?', [userId], (err, results) => {
    if (err) {
      console.error('Error querying database:', err);
      res.status(500).send('Internal Server Error');
      return;
    }
    res.json(results);
  });
});

app.post('/api/reclamations', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { categorie, description } = req.body;
  const date = new Date(); // Date actuelle
  const status = 'Problem';

  const query = 'INSERT INTO reclamations (user_id, date, categorie, description, status) VALUES (?, ?, ?, ?, ?)';
  db.query(query, [userId, date, categorie, description, status], (err, result) => {
    if (err) {
      console.error('Erreur lors de l\'insertion de la réclamation :', err);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
    res.status(201).json({ message: 'Réclamation ajoutée avec succès', id: result.insertId });
  });
});

app.get('/api/reclamations', authenticateToken, (req, res) => {
  const userId = req.user.id;

  const query = 'SELECT date, categorie, description, status FROM reclamations WHERE user_id = ? ORDER BY date DESC';
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Erreur lors de la récupération des réclamations :', err);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
    res.json(results);
  });
});



//espaces**********************
app.post('/api/espaces', authenticateToken, (req, res) => {
  const { nom, ville, gouvernorat, activite, stations } = req.body;
  const userId = req.user.id;

  db.query(
    'INSERT INTO espaces (nom, ville, gouvernorat, activite, stations, user_id) VALUES (?, ?, ?, ?, ?, ?)',
    [nom, ville, gouvernorat, activite, stations, userId],
    (err, result) => {
      if (err) return res.status(500).send('Erreur ajout');
      res.json({ message: 'Espace ajouté avec succès' });
    }
  );
});

app.get('/api/espaces', authenticateToken, (req, res) => {
  const userId = req.user.id;

  const query = 'SELECT nom, ville, gouvernorat, activite, stations FROM espaces WHERE user_id = ?';
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Erreur lors de la récupération des espaces :', err);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
    res.json(results);
  });
});



// Récupérer toutes les Q/R
app.get('/api/faq', (req, res) => {
  db.query('SELECT * FROM faq', (err, results) => {
    if (err) return res.status(500).send(err);
    const data = results.map(row => ({
      id: row.id,
      question: row.question,
      answers: JSON.parse(row.answers)
    }));
    res.json(data);
  });
});

// Ajouter une Q/R
app.post('/api/faq/add', (req, res) => {
  const { question, answers } = req.body;
  db.query('INSERT INTO faq (question, answers) VALUES (?, ?)', 
    [question, JSON.stringify(answers)], 
    (err) => {
      if (err) return res.status(500).send(err);
      res.json({ success: true });
    });
});

// Modifier une Q/R
app.put('/api/faq/update/:id', (req, res) => {
  const { id } = req.params;
  const { question, answers } = req.body;
  db.query('UPDATE faq SET question = ?, answers = ? WHERE id = ?', 
    [question, JSON.stringify(answers), id], 
    (err) => {
      if (err) return res.status(500).send(err);
      res.json({ success: true });
    });
});

// Supprimer une Q/R
app.delete('/api/faq/delete/:id', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM faq WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).send(err);
    res.json({ success: true });
  });
});

/*authentification admin */
// Configuration de multer pour le stockage des images
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });
// ==== Upload pour les réclamations ====
const storageReclam = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/reclamations/'); // dossier séparé
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});
const uploadReclamation = multer({ storage: storageReclam });




// Clé secrète JWT
//const SECRET_KEY = 'VOLTWISE_SECRET_2025';
const SECRET_KEY = process.env.JWT_SECRET;

// 🔐 Route Register Admin
app.post('/register', upload.single('image'), async (req, res) => {
  const { nom, prenom, telephone, email, poste, password } = req.body;
  const image = req.file ? req.file.filename : null;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = `
      INSERT INTO admins (nom, prenom, telephone, email, poste, mot_de_passe, image)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, [nom, prenom, telephone, email, poste, hashedPassword, image], (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Erreur lors de l’inscription' });
      }
      res.status(200).json({ message: 'Admin enregistré avec succès' });
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// 🔑 Route Login Admin
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  const sql = `SELECT * FROM admins WHERE email = ?`;
  db.query(sql, [email], async (err, results) => {
    if (err || results.length === 0) {
      return res.status(401).json({ message: 'Email incorrect' });
    }

    const admin = results[0];
    const isPasswordValid = await bcrypt.compare(password, admin.mot_de_passe);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Mot de passe incorrect' });
    }

    const token = jwt.sign({ id: admin.id, email: admin.email }, SECRET_KEY, { expiresIn: '2h' });

    res.status(200).json({
      message: 'Connexion réussie',
      token,
      admin: {
        id: admin.id,
        nom: admin.nom,
        prenom: admin.prenom,
        email: admin.email,
        poste: admin.poste,
        telephone: admin.telephone,
        image: admin.image
      }
    });
  });
});

  
function authenticateAdminToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.admin = user;
    next();
  });
}

app.get('/api/admin/me', authenticateAdminToken, (req, res) => {
  db.query("SELECT id, nom, prenom, email,telephone, poste, image FROM admins WHERE id = ?", [req.admin.id], (err, results) => {
    if (err || results.length === 0) return res.status(404).json({ message: 'Admin non trouvé' });
    res.json(results[0]);
  });
});
// backend/routes/admin.js ou directement dans ton fichier principal

/*app.put('/api/admin/:id', authenticateAdminToken, upload.single('image'), (req, res) => {
  const adminId = req.params.id;
  const { nom, prenom, email, telephone, poste } = req.body;
  const image = req.file ? req.file.filename : null;

  if (!nom || !prenom || !email || !telephone || !poste) {
    return res.status(400).json({ message: "Champs manquants." });
  }

  const updateFields = [nom, prenom, email, telephone, poste];
  let sql = `
    UPDATE admins 
    SET nom = ?, prenom = ?, email = ?, telephone = ?, poste = ?
  `;

  if (image) {
    sql += `, image = ?`;
    updateFields.push(image);
  }

  sql += ` WHERE id = ?`;
  updateFields.push(adminId);

  db.query(sql, updateFields, (err, result) => {
    if (err) {
      console.error("Erreur update admin:", err);
      return res.status(500).json({ message: "Erreur serveur." });
    }
    res.json({ message: "Profil mis à jour avec succès." });
  });
});
*/
app.put('/api/admin/:id', authenticateAdminToken, upload.single('image'), (req, res) => {
  const adminId = req.params.id;
  const { nom, prenom, email, telephone, poste } = req.body;
  const image = req.file ? req.file.filename : null;

  if (!nom || !prenom || !email || !telephone || !poste) {
    return res.status(400).json({ message: "Champs manquants." });
  }

  const updateFields = [nom, prenom, email, telephone, poste];
  let sql = `
    UPDATE admins 
    SET nom = ?, prenom = ?, email = ?, telephone = ?, poste = ?
  `;

  if (image) {
    sql += `, image = ?`;
    updateFields.push(image);
  }

  sql += ` WHERE id = ?`;
  updateFields.push(adminId);

  db.query(sql, updateFields, (err, result) => {
    if (err) {
      console.error("Erreur update admin:", err);
      return res.status(500).json({ message: "Erreur serveur." });
    }
    // On renvoie le nom de l'image si mise à jour, sinon null
    res.json({ 
      message: "Profil mis à jour avec succès.",
      updatedImageName: image // soit le nom, soit null si pas d'image uploadée
    });
  });
});
/*le contenue de ladminn*********/
/*app.get('/api/users', (req, res) => {
  db.query('SELECT id, fullName, email, phone, companyName AS society, role FROM users', (err, results) => {
    if (err) return res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs.' });
    res.json(results);
  });
});*/
app.get('/api/users', authenticateToken, (req, res) => {
  const sql = 'SELECT * FROM users';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: 'Erreur base de données' });
    res.json(results);
  });
});

// 🔴 SUPPRIMER un utilisateur
app.delete('/api/users/:id', authenticateAdminToken, (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM users WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).json({ message: "Erreur suppression" });
    res.json({ message: "Utilisateur supprimé" });
  });
});

// 🟡 MODIFIER un utilisateur
app.put('/api/users/:id', authenticateAdminToken, (req, res) => {
  const { id } = req.params;
  const { fullName, email, phone, companyName, job } = req.body;
  db.query(
    "UPDATE users SET fullName = ?, email = ?, phone = ?, companyName = ?, job = ? WHERE id = ?",
    [fullName, email, phone, companyName, job, id],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Erreur mise à jour" });
      res.json({ message: "Utilisateur modifié" });
    }
  );
});

// Voir toutes les réclamations (Admin uniquement)
app.get('/api/admin/reclamations', authenticateToken, (req, res) => {
  
const query = `
    SELECT r.id, r.date, r.categorie, r.description, r.status, u.email AS user
    FROM reclamations r
    JOIN users u ON r.user_id = u.id
    ORDER BY r.date DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Erreur lors de la récupération des réclamations :', err);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
    res.json(results);
  });
});


/***********espaces  */
/*app.get('/api/admin/stations', authenticateToken, (req, res) => {
  
  const query = `
    SELECT s.*, u.email AS client
    FROM stations s
    JOIN users u ON s.user_id = u.id
    ORDER BY s.date_installation DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Erreur lors de la récupération des stations :', err);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
    res.json(results);
  });
});*/

app.get('/api/admin/espaces', authenticateToken, (req, res) => {
  
  const query = `
    SELECT e.id, e.nom, e.ville, e.gouvernorat, e.activite, e.stations, u.fullName AS client
    FROM espaces e
    JOIN users u ON e.user_id = u.id
    ORDER BY e.nom ASC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Erreur SQL :', err);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
    res.json(results);
  });
});

app.get('/api/admin/stations', authenticateToken, (req, res) => {
  

  const query = `
    SELECT 
      s.reference,
      s.espace AS espacePublic,
      s.adresse,
      s.date_installation AS fabrication,
      e.nom AS secteur,
      e.gouvernorat,
      e.ville,
      u.email AS client
    FROM stations s
    LEFT JOIN espaces e ON s.espace = e.id
    LEFT JOIN users u ON s.user_id = u.id
    ORDER BY s.date_installation DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Erreur SQL :', err);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
    res.json(results);
  });
});

/*****************reclamation qr  */
/*app.post('/api/reclamations/qr', (req, res) => {
  const {
    nom, prenom, telephone, typeBox,
    entreprise, gouvernorat, reponses
  } = req.body;

  const date = new Date();
  const sql = `
    INSERT INTO reclamations_qr
    (nom, prenom, telephone, type_box, entreprise, gouvernorat, question1, question2, question3, question4, question5, date_reclamation)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    nom, prenom, telephone, typeBox, entreprise, gouvernorat,
    reponses[0], reponses[1], reponses[2], reponses[3], reponses[4], date
  ];

  db.query(sql, values, (err) => {
    if (err) return res.status(500).json({ message: 'Erreur serveur' });
    res.status(200).json({ message: 'Réclamation enregistrée' });
  });
});*/
app.post('/api/reclamations/qr', uploadReclamation.single('photo'), (req, res) => {
  // Sécuriser le destructuring
  const b = req.body || {};
  const {
    nom,
    prenom,
    email,
    telephone,
    type_retour,
    lieu,
    date_probleme,
    heure_probleme,
    usage_nano_box,
    description,
    souhaite_retour
  } = b;

  const photo_url = req.file ? `/uploads/reclamations/${req.file.filename}` : null;

  const sql = `
    INSERT INTO reclamations_qr
    (nom, prenom, email, telephone, type_retour, lieu, date_probleme, heure_probleme, usage_nano_box, description, photo_url, souhaite_retour, date_reclamation)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)
  `;

  db.query(sql, [
    nom || '',
    prenom || '',
    email || null,
    telephone || '',
    type_retour || '',
    lieu || '',
    date_probleme || null,
    heure_probleme || null,
    usage_nano_box || '',
    description || null,
    photo_url,
    souhaite_retour || 'non',
    new Date()
  ], (err) => {
    if (err) {
      console.error('Erreur insertion réclamation QR:', err);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
    res.status(200).json({ message: 'Réclamation enregistrée' });
  });
});


/******affichage du reclamation qr  */
/*app.get('/api/reclamations-qr', (req, res) => {
  const sql = 'SELECT * FROM reclamations_qr ORDER BY date_reclamation DESC';
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Erreur lors de la récupération des réclamations QR :', err);
      return res.status(500).json({ message: 'Erreur lors de la récupération des données.' });
    }
    res.status(200).json(results);
  });
});*/
// GET /api/reclamations-qr?search=&type_retour=&from=&to=&page=1&limit=10
/*app.get('/api/reclamations-qr', (req, res) => {
  const {
    search = '',
    type_retour = '',
    from = '',
    to = '',
    page = '1',
    limit = '10'
  } = req.query;

  const pageNum = Math.max(parseInt(page) || 1, 1);
  const lim = Math.max(parseInt(limit) || 10, 1);
  const offset = (pageNum - 1) * lim;

  // Build WHERE
  const where = [];
  const params = [];

  if (search) {
    // recherche sur nom, prenom, email, telephone, lieu, description
    where.push(`(
      nom LIKE ? OR prenom LIKE ? OR email LIKE ? OR telephone LIKE ?
      OR lieu LIKE ? OR description LIKE ?
    )`);
    const s = `%${search}%`;
    params.push(s, s, s, s, s, s);
  }

  if (type_retour) {
    where.push(`type_retour = ?`);
    params.push(type_retour);
  }

  if (from) {
    where.push(`date_reclamation >= ?`);
    params.push(from + ' 00:00:00');
  }
  if (to) {
    where.push(`date_reclamation <= ?`);
    params.push(to + ' 23:59:59');
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const sqlData = `
    SELECT id, nom, prenom, email, telephone, type_retour, lieu,
           date_probleme, heure_probleme, usage_nano_box, description,
           photo_url, souhaite_retour, date_reclamation
    FROM reclamations_qr
    ${whereSql}
    ORDER BY date_reclamation DESC
    LIMIT ? OFFSET ?
  `;

  const sqlCount = `
    SELECT COUNT(*) as total
    FROM reclamations_qr
    ${whereSql}
  `;

  // Count total
  db.query(sqlCount, params, (err, countRows) => {
    if (err) {
      console.error('Erreur COUNT réclamations:', err);
      return res.status(500).json({ message: 'Erreur lors du comptage.' });
    }
    const total = countRows[0]?.total || 0;

    // Data
    db.query(sqlData, [...params, lim, offset], (err2, rows) => {
      if (err2) {
        console.error('Erreur SELECT réclamations:', err2);
        return res.status(500).json({ message: 'Erreur lors de la récupération.' });
      }

      res.status(200).json({
        data: rows,
        pagination: {
          page: pageNum,
          limit: lim,
          total,
          pages: Math.ceil(total / lim)
        }
      });
    });
  });
});

app.delete('/api/reclamations-qr/:id', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM reclamations_qr WHERE id = ?', [id], (err, result) => {
    if (err) return res.status(500).json({ message: 'Erreur suppression.' });
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Non trouvée.' });
    res.json({ message: 'Supprimée.' });
  });
});
*/
// LISTE SIMPLE – Réclamations QR (affichage back pour l’admin)
// GET /api/reclamations-qr
app.get('/api/reclamations-qr', (req, res) => {
  const sql = `
    SELECT
      id,
      nom,
      prenom,
      email,
      telephone,
      type_retour,
      lieu,
      DATE_FORMAT(date_probleme, '%Y-%m-%d')   AS date_probleme,
      TIME_FORMAT(heure_probleme, '%H:%i')     AS heure_probleme,
      usage_nano_box,
      description,
      photo_url,
      souhaite_retour,
      date_reclamation
    FROM reclamations_qr
    ORDER BY date_reclamation DESC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error('Erreur SELECT réclamations QR:', err);
      return res.status(500).json({ message: 'Erreur lors de la récupération des données.' });
    }
    res.status(200).json(rows);
  });
});





  
// Démarrage du serveur
app.listen(3000, () => console.log("Serveur démarré sur http://localhost:3000"));
