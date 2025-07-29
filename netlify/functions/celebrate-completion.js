exports.handler = async (event, context) => {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
  
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' };
    }
  
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, headers, body: 'Method Not Allowed' };
    }
  
    try {
      const { email, userName } = JSON.parse(event.body);
      const MAILERLITE_API_KEY = process.env.MAILERLITE_API_KEY;
      const GROUP_ID = '161273614723712581';
      
      // Ajouter à MailerLite
      const response = await fetch('https://api.mailerlite.com/api/v2/groups/' + GROUP_ID + '/subscribers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MailerLite-ApiKey': MAILERLITE_API_KEY
        },
        body: JSON.stringify({
          email: email,
          name: userName || email.split('@')[0],
          fields: {
            jour_complete: new Date().toISOString(),
            programme: 'Journal 30 Jours'
          },
          resubscribe: true
        })
      });
  
      if (!response.ok) {
        throw new Error('MailerLite error');
      }
  
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true,
          message: 'Email de félicitations envoyé !'
        })
      };
  
    } catch (error) {
      console.error('Error:', error);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: false,
          message: 'Erreur envoi email'
        })
      };
    }
  };