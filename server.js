const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const fs = require('fs');

const app = express();
// Middleware
app.use(express.json());
app.use(cors());

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
      const pdfPath = `./formulaire_${Date.now()}.pdf`;
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
    const limit = 10;  // Nombre d’utilisateurs par page
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
  

  
// Démarrage du serveur
app.listen(3000, () => console.log("Serveur démarré sur http://localhost:3000"));
