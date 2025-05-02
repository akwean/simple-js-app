document.addEventListener('DOMContentLoaded', function() {
  // Check if we're on the AI.html page and don't initialize the chatbot if we are
  const currentPage = window.location.pathname;
  if (currentPage.endsWith('/AI.html')) {
    return; // Don't initialize the chatbot on AI.html
  }
  
  // Check if chatbot already exists (prevent duplicate initialization)
  if (document.getElementById('chatbotWidget')) {
    return;
  }
  
  // Create chatbot widget
  const chatbotWidget = document.createElement('div');
  chatbotWidget.id = 'chatbotWidget';
  
  chatbotWidget.innerHTML = `
    <div class="chatbot-icon">
      <i class="fas fa-robot"></i>
    </div>
    <div class="chatbot-window hidden">
      <div class="chat-header">
        <h4>BUPC Clinic Assistant</h4>
        <button class="close-chat">&times;</button>
      </div>
      <div class="chat-box" id="chatBox"></div>
      <button class="scroll-bottom" id="scrollBottom">
        <i class="fas fa-arrow-down"></i>
      </button>
      <div class="chat-input">
        <input type="text" id="userInput" placeholder="Type your message...">
        <button id="sendMessage">Send</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(chatbotWidget);
  
  // Keep track of conversation context
  let conversationContext = JSON.parse(sessionStorage.getItem('chatbotContext') || '{"lastTopic":null,"unansweredQuestions":[],"topicMentioned":{}}');
  
  const chatIcon = document.querySelector('.chatbot-icon');
  const chatWindow = document.querySelector('.chatbot-window');
  const closeChat = document.querySelector('.close-chat');
  const chatBox = document.getElementById('chatBox');
  const userInput = document.getElementById('userInput');
  const sendButton = document.getElementById('sendMessage');
  const scrollBottomBtn = document.getElementById('scrollBottom');
  
  // Check for session storage and restore previous conversation
  loadConversation();
  
  // Toggle chat window
  chatIcon.addEventListener('click', function() {
    chatWindow.classList.toggle('hidden');
    if (!chatWindow.classList.contains('hidden')) {
      userInput.focus();
      scrollToBottom();
    }
  });
  
  // Close chat window
  closeChat.addEventListener('click', function() {
    chatWindow.classList.add('hidden');
  });
  
  // Send message on button click
  sendButton.addEventListener('click', sendMessage);
  
  // Send message on Enter key
  userInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });
  
  // Scroll to bottom button
  scrollBottomBtn.addEventListener('click', scrollToBottom);
  
  // Detect scroll position
  chatBox.addEventListener('scroll', function() {
    const isScrolledUp = chatBox.scrollTop < chatBox.scrollHeight - chatBox.clientHeight - 50;
    if (isScrolledUp) {
      scrollBottomBtn.classList.add('visible');
    } else {
      scrollBottomBtn.classList.remove('visible');
    }
  });
  
  // Check if it's the first time opening the chatbot in this session
  if (!sessionStorage.getItem('chatbotInitialized')) {
    setTimeout(() => {
      addMessage("Hello! I'm the BUPC Clinic Assistant. How can I help you today?", 'bot');
      sessionStorage.setItem('chatbotInitialized', 'true');
      saveConversation();
    }, 1000);
  }
  
  function sendMessage() {
    const message = userInput.value.trim();
    if (message) {
      addMessage(message, 'user');
      userInput.value = '';
      
      // Process user message and respond
      setTimeout(async () => {
        // First, try to get a response from our predefined answers
        const response = getBotResponse(message);
        
        // If we couldn't understand the query, call the AI API
        if (response.includes("I'm sorry I couldn't understand")) {
          await getAIResponse(message);
        } else {
          // Otherwise, use our local response
          addMessage(response, 'bot');
          
          // Update context after response
          updateContext(message, response);
          
          // Add feedback options for complex queries
          if (response.includes("I'm sorry I couldn't understand")) {
            addFeedbackOptions(message);
          }
        }
      }, 500);
    }
  }
  
  // Add a new function to call the OpenRouter API
  async function getAIResponse(message) {
    // Add a "thinking" message
    addMessage("Let me think about that...", 'bot');
    
    try {
      // Call the OpenRouter API
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": "Bearer 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",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          "model": "google/gemma-3-1b-it:free", 
          "messages": [
            { 
              "role": "system", 
              "content": "You are a helpful assistant for BUPC Clinic. Provide concise, accurate information related to healthcare, medical services, and clinic operations." 
            },
            { 
              "role": "user", 
              "content": message 
            }
          ] 
        })
      });

      const data = await response.json();
      
      // Remove the "thinking" message
      const thinkingMsg = document.querySelector('#chatBox .message.bot-message:last-child');
      if (thinkingMsg && thinkingMsg.textContent === "Let me think about that...") {
        thinkingMsg.remove();
      }
      
      // Add the AI response
      const aiContent = data.choices?.[0]?.message?.content || 
                        "I'm sorry, I couldn't get a response from my knowledge base right now. Please try again later.";
      
      // Create a container for the rendered markdown
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = marked.parse(aiContent);
      
      // Extract text content without HTML
      const cleanContent = tempDiv.textContent;
      
      addMessage(cleanContent, 'bot');
      
      // Add an attribution message
      addMessage("(Response provided by AI assistant)", 'system');
      
    } catch (error) {
      console.error("Error calling AI API:", error);
      
      // Remove the "thinking" message
      const thinkingMsg = document.querySelector('#chatBox .message.bot-message:last-child');
      if (thinkingMsg && thinkingMsg.textContent === "Let me think about that...") {
        thinkingMsg.remove();
      }
      
      // Fallback to a standard response
      addMessage("I'm having trouble connecting to my knowledge base. Let me provide a simpler answer.", 'bot');
      const simpleFallbackResponse = getFallbackResponse(message);
      addMessage(simpleFallbackResponse, 'bot');
    }
  }
  
  // Simple fallback responses when AI API fails
  function getFallbackResponse(message) {
    message = message.toLowerCase();
    
    if (message.includes('what') || message.includes('how') || message.includes('why')) {
      return "That's a great question. For detailed information on this topic, please contact our clinic staff directly or visit our information desk.";
    } else if (message.includes('when') || message.includes('where') || message.includes('who')) {
      return "For specific details on timing, location, or staff information, please check our website's FAQ section or contact the front desk.";
    } else {
      return "I understand this is important. Please reach out to our clinic staff who can provide you with accurate and detailed information about your query.";
    }
  }
  
  function addMessage(message, sender) {
    const messageElement = document.createElement('div');
    
    // Add appropriate classes based on sender
    if (sender === 'system') {
      messageElement.classList.add('message', 'system-message');
      messageElement.style.fontSize = '0.8em';
      messageElement.style.fontStyle = 'italic';
      messageElement.style.color = '#666';
      messageElement.style.textAlign = 'center';
      messageElement.style.margin = '5px 0';
    } else {
      messageElement.classList.add('message', sender + '-message');
    }
    
    messageElement.textContent = message;
    
    chatBox.appendChild(messageElement);
    scrollToBottom();
    
    // Save to session storage (except system messages)
    if (sender !== 'system') {
      saveConversation();
    }
  }
  
  function scrollToBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
    scrollBottomBtn.classList.remove('visible');
  }
  
  function saveConversation() {
    // Save conversation to session storage
    const messages = [];
    document.querySelectorAll('.message').forEach(msg => {
      const sender = msg.classList.contains('user-message') ? 'user' : 'bot';
      messages.push({ text: msg.textContent, sender: sender });
    });
    sessionStorage.setItem('chatbotMessages', JSON.stringify(messages));
  }
  
  function loadConversation() {
    // Load conversation from session storage
    const savedMessages = sessionStorage.getItem('chatbotMessages');
    if (savedMessages) {
      const messages = JSON.parse(savedMessages);
      messages.forEach(msg => {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', msg.sender + '-message');
        messageElement.textContent = msg.text;
        chatBox.appendChild(messageElement);
      });
    }
  }
  
  // Rest of the code (getBotResponse, updateContext, etc.) remains unchanged
  
  // Update context based on the current message and response
  function updateContext(message, response) {
    const msg = message.toLowerCase();
    
    // Update last topic based on the response
    if (response.includes("appointment")) {
      conversationContext.lastTopic = 'appointments';
      conversationContext.topicMentioned.appointment = true;
    } else if (response.includes("service")) {
      conversationContext.lastTopic = 'services';
      conversationContext.topicMentioned.service = true;
    } else if (response.includes("medical")) {
      conversationContext.lastTopic = 'medical';
      conversationContext.topicMentioned.medical = true;
    } else if (response.includes("dental")) {
      conversationContext.lastTopic = 'dental';
      conversationContext.topicMentioned.dental = true;
    } else if (response.includes("vaccination")) {
      conversationContext.lastTopic = 'vaccination';
      conversationContext.topicMentioned.vaccination = true;
    }
    
    // Save context to session storage for persistence
    sessionStorage.setItem('chatbotContext', JSON.stringify(conversationContext));
  }
  
  // Add feedback options for learning
  function addFeedbackOptions(question) {
    const feedbackElement = document.createElement('div');
    feedbackElement.classList.add('feedback-options');
    feedbackElement.innerHTML = `
      <p>Was this response helpful?</p>
      <div class="feedback-buttons">
        <button data-value="yes">Yes</button>
        <button data-value="no">No</button>
      </div>
    `;
    
    chatBox.appendChild(feedbackElement);
    
    // Add event listeners to feedback buttons
    feedbackElement.querySelectorAll('button').forEach(button => {
      button.addEventListener('click', function() {
        const value = this.getAttribute('data-value');
        if (value === 'no') {
          // If feedback is negative, offer topic selection
          offerTopicSelection(question);
        }
        
        // Remove feedback options after selection
        feedbackElement.remove();
      });
    });
  }
  
  // Offer topic selection to improve future responses
  function offerTopicSelection(question) {
    const topicElement = document.createElement('div');
    topicElement.classList.add('topic-selection');
    topicElement.innerHTML = `
      <p>What was your question about?</p>
      <div class="topic-buttons">
        <button data-topic="appointments">Appointments</button>
        <button data-topic="services">Services</button>
        <button data-topic="hours">Hours</button>
        <button data-topic="location">Location</button>
        <button data-topic="other">Other</button>
      </div>
    `;
    
    chatBox.appendChild(topicElement);
    
    // Add event listeners to topic buttons
    topicElement.querySelectorAll('button').forEach(button => {
      button.addEventListener('click', function() {
        const topic = this.getAttribute('data-topic');
        
        // Store the question with the selected topic for learning
        learnFromQuestion(question, topic);
        
        // Add a message acknowledging the feedback
        addMessage(`Thank you for your feedback. I'll try to provide better answers about ${topic} in the future.`, 'bot');
        
        // Remove topic selection after choice
        topicElement.remove();
      });
    });
  }
  
  // Learn from user feedback for future improvements
  function learnFromQuestion(question, topic) {
    // In a real system, this would send data to a server for machine learning
    // Here we'll just store it in session storage for demonstration
    let learnedQuestions = JSON.parse(sessionStorage.getItem('learnedQuestions') || '{}');
    
    if (!learnedQuestions[topic]) {
      learnedQuestions[topic] = [];
    }
    
    learnedQuestions[topic].push(question);
    sessionStorage.setItem('learnedQuestions', JSON.stringify(learnedQuestions));
    
    console.log(`Learned that question "${question}" is about ${topic}`);
  }
  
  // Check if the question is follow-up or related to previous context
  function hasContextualQuestion(message) {
    // Check for follow-up indicators
    const followUpIndicators = ['what about', 'and', 'how about', 'what else', 'also', 
                                'more', 'another', 'then', 'after that', 'ok so'];
    
    for (const indicator of followUpIndicators) {
      if (message.toLowerCase().includes(indicator)) {
        return true;
      }
    }
    
    // Check for short responses that might be follow-ups
    if (message.split(' ').length <= 3 && conversationContext.lastTopic) {
      return true;
    }
    
    return false;
  }
  
  // Handle contextual responses based on previous conversation
  function handleContextualQuestion(message) {
    const msg = message.toLowerCase();
    
    // If the last topic was about services and user asks for more details
    if (conversationContext.lastTopic === 'services') {
      if (msg.includes('more') || msg.includes('detail') || msg.includes('explain')) {
        return "Our services include comprehensive healthcare for students and staff. " +
               "Medical consultations cover general health concerns, prescriptions, and specialist referrals. " +
               "Physical examinations are available for sports, academic requirements, or general health assessment. " +
               "Our dental services include regular check-ups, cleanings, and basic procedures. " +
               "We also offer seasonal and required vaccinations.";
      }
    }
    
    // If the last topic was about appointments
    if (conversationContext.lastTopic === 'appointments') {
      if (msg.includes('how long') || msg.includes('duration') || msg.includes('wait time')) {
        return "Typical appointments last about 30 minutes. Wait times are usually minimal if you arrive on time for your scheduled appointment.";
      }
      
      if (msg.includes('need') || msg.includes('bring') || msg.includes('required')) {
        return "For your appointment, please bring your student/staff ID, any relevant medical records, and a list of current medications if applicable.";
      }
    }
    
    // For any other follow-up questions, try to provide a relevant response based on keywords
    for (const topic in conversationContext.topicMentioned) {
      if (conversationContext.topicMentioned[topic]) {
        if (topic === 'medical' && (msg.includes('cost') || msg.includes('price') || msg.includes('fee'))) {
          return "Medical consultations are free for enrolled students who have paid their health service fees. Staff members may have different fee structures based on their insurance coverage.";
        }
        
        if (topic === 'dental' && (msg.includes('cost') || msg.includes('price') || msg.includes('fee'))) {
          return "Basic dental check-ups are covered by student health fees. More advanced procedures may have additional costs depending on your insurance coverage.";
        }
      }
    }
    
    // If no specific contextual response, provide general follow-up
    return "I notice you're asking a follow-up question. Could you provide more details about what specifically you'd like to know?";
  }
  
  // Store unanswered questions for potential learning
  function storeUnansweredQuestion(question) {
    // Only store if not already present
    if (!conversationContext.unansweredQuestions.includes(question)) {
      conversationContext.unansweredQuestions.push(question);
      
      // Limit the array to prevent memory issues
      if (conversationContext.unansweredQuestions.length > 10) {
        conversationContext.unansweredQuestions.shift();
      }
      
      // In a real system, you might want to save these to a server for analysis
      console.log("Unanswered question stored:", question);
    }
  }
  
  // Helper function to check for partial matches
  function part(word) {
    return word.substring(0, Math.ceil(word.length * 0.7));
  }
  
  // Simple Levenshtein distance to check string similarity
  function levenshteinSimilarity(s1, s2) {
    if (s1.length < 2 || s2.length < 2) return 0;
    
    const track = Array(s2.length + 1).fill(null).map(() => 
      Array(s1.length + 1).fill(null));
    
    for (let i = 0; i <= s1.length; i++) track[0][i] = i;
    for (let j = 0; j <= s2.length; j++) track[j][0] = j;
    
    for (let j = 1; j <= s2.length; j++) {
      for (let i = 1; i <= s1.length; i++) {
        const ind = s1[i - 1] === s2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1,
          track[j - 1][i] + 1,
          track[j - 1][i - 1] + ind
        );
      }
    }
    
    const maxLength = Math.max(s1.length, s2.length);
    const distance = track[s2.length][s1.length];
    return 1 - (distance / maxLength);
  }
  
  function getBotResponse(message) {
    // Enhanced response logic with improved keyword detection
    const userMsg = message.toLowerCase();
    
    // Check if this is a complex question that should be handled by AI
    if (isComplexQuestion(userMsg)) {
      return "I'm sorry I couldn't understand your question well enough. Let me consult my advanced knowledge base.";
    }
    
    // Add specific profile-related queries for profile page
    if (window.location.pathname.includes('profile')) {
      if (userMsg.includes('save') || userMsg.includes('update') || userMsg.includes('submit') || 
          userMsg.includes('complete profile') || userMsg.includes('finish profile')) {
        return "You can save your profile by filling out all required fields marked with an asterisk (*) and clicking the 'Update Profile' button at the bottom of the form.";
      }
      
      if (userMsg.includes('required') || userMsg.includes('mandatory') || userMsg.includes('must fill')) {
        return "Required fields are marked with an asterisk (*). These include date of birth, gender, address, city, province, postal code, and emergency contact information.";
      }
    }
    
    // Appointment related queries - expanded keywords
    if (userMsg.includes('appointment') || userMsg.includes('book') || userMsg.includes('schedule') || 
        userMsg.includes('reserve') || userMsg.includes('set up') || userMsg.includes('make') || 
        userMsg.includes('arrange') || userMsg.includes('get an') || userMsg.includes('how to book') ||
        userMsg.includes('how to make') || userMsg.includes('need appointment')) {
      return "You can book an appointment by clicking on 'Book Appointment' on the homepage or navigating to the Appointments page. Would you like to know about available services?";
    } 
    
    // Clinic hours - expanded keywords
    else if (userMsg.includes('hours') || userMsg.includes('open') || userMsg.includes('close') || 
             userMsg.includes('when') || userMsg.includes('time') || userMsg.includes('schedule') || 
             userMsg.includes('timing') || userMsg.includes('operation') || userMsg.includes('working hours') ||
             userMsg.includes('business hours') || userMsg.includes('clinic time')) {
      return "The BUPC Clinic is open Monday through Friday, 8:00 AM to 5:00 PM. We are closed on weekends and public holidays.";
    } 
    
    // Services offered - expanded keywords
    else if (userMsg.includes('service') || userMsg.includes('offer') || userMsg.includes('provide') || 
             userMsg.includes('available') || userMsg.includes('help') || userMsg.includes('do you do') ||
             userMsg.includes('what can') || userMsg.includes('services') || userMsg.includes('treatments') ||
             userMsg.includes('what do you offer') || userMsg.includes('what do you provide')) {
      return "We offer several services including:\n- Medical consultations\n- Physical examinations\n- Dental services\n- Vaccinations\nWhich service would you like to know more about?";
    } 
    
    // Medical consultations - expanded keywords
    else if (userMsg.includes('medical') || userMsg.includes('consult') || userMsg.includes('doctor') || 
             userMsg.includes('physician') || userMsg.includes('checkup') || userMsg.includes('check up') ||
             userMsg.includes('consultation') || userMsg.includes('health concern') || userMsg.includes('see a doctor')) {
      return "Our medical consultations are available every weekday. Our doctors can help with general health concerns, prescriptions, and referrals to specialists if needed.";
    }
    
    // Dental services - expanded keywords
    else if (userMsg.includes('dental') || userMsg.includes('teeth') || userMsg.includes('tooth') || 
             userMsg.includes('dentist') || userMsg.includes('mouth') || userMsg.includes('oral') ||
             userMsg.includes('cleaning') || userMsg.includes('cavity') || userMsg.includes('braces')) {
      return "Our dental services include regular check-ups, cleanings, and basic dental procedures. You can book a dental appointment through the Appointments page.";
    }
    
    // Vaccinations - expanded keywords
    else if (userMsg.includes('vaccine') || userMsg.includes('vaccination') || userMsg.includes('shot') || 
             userMsg.includes('immunization') || userMsg.includes('flu') || userMsg.includes('covid') ||
             userMsg.includes('immunize') || userMsg.includes('booster') || userMsg.includes('jab')) {
      return "We provide various vaccinations including flu shots, COVID-19 vaccines, and required immunizations for students. Please bring your immunization record when coming for vaccination.";
    }
    
    // Cancel/Reschedule - expanded keywords
    else if (userMsg.includes('cancel') || userMsg.includes('reschedule') || userMsg.includes('change appointment') || 
             userMsg.includes('modify') || userMsg.includes('change date') || userMsg.includes('postpone') ||
             userMsg.includes('move appointment') || userMsg.includes('change time') || 
             userMsg.includes('delete appointment') || userMsg.includes('remove booking')) {
      return "To cancel or reschedule an appointment, please visit the Medical History page and look for your upcoming appointments. You can modify appointments up to 24 hours before the scheduled time.";
    }
    
    // Location - expanded keywords
    else if (userMsg.includes('where') || userMsg.includes('location') || userMsg.includes('address') || 
             userMsg.includes('find') || userMsg.includes('direction') || userMsg.includes('situated') ||
             userMsg.includes('place') || userMsg.includes('building') || userMsg.includes('clinic located') ||
             userMsg.includes('get to') || userMsg.includes('clinic address')) {
      return "The BUPC Clinic is located on the main campus in the Health Services Building. You can find directions on the Contact page of our website.";
    }
    
    // Profile - expanded keywords
    else if (userMsg.includes('profile') || userMsg.includes('account') || userMsg.includes('information') || 
             userMsg.includes('personal') || userMsg.includes('details') || userMsg.includes('data') ||
             userMsg.includes('my info') || userMsg.includes('my details') || userMsg.includes('update info')) {
      return "You can view and update your profile information by clicking on your name in the top right corner and selecting 'Profile' from the dropdown menu.";
    }
    
    // Medical history - expanded keywords
    else if (userMsg.includes('history') || userMsg.includes('record') || userMsg.includes('past appointment') || 
             userMsg.includes('previous') || userMsg.includes('last visit') || userMsg.includes('medical record') ||
             userMsg.includes('past visit') || userMsg.includes('earlier appointment') || userMsg.includes('my records')) {
      return "Your medical history and past appointments can be viewed in the Medical History section. This includes all your previous visits, treatments, and prescriptions.";
    }
    
    // Contact - expanded keywords
    else if (userMsg.includes('contact') || userMsg.includes('phone') || userMsg.includes('email') || 
             userMsg.includes('call') || userMsg.includes('message') || userMsg.includes('reach') ||
             userMsg.includes('telephone') || userMsg.includes('number') || userMsg.includes('mail')) {
      return "You can contact the BUPC Clinic at clinic@bupc.edu or by phone at (555) 123-4567 during our operating hours.";
    }
    
    // Greetings - expanded keywords
    else if (userMsg.includes('hello') || userMsg.includes('hi') || userMsg.includes('hey') || 
             userMsg.includes('greetings') || userMsg.includes('good morning') || userMsg.includes('good afternoon') ||
             userMsg.includes('good evening') || userMsg.includes('howdy') || userMsg.includes('yo') ||
             userMsg.match(/^hi$/)) {
      return "Hello! How can I assist you with the BUPC Clinic services today?";
    } 
    
    // Thanks - expanded keywords
    else if (userMsg.includes('thank') || userMsg.includes('thanks') || userMsg.includes('appreciate') || 
             userMsg.includes('grateful') || userMsg.includes('good job') || userMsg.includes('well done')) {
      return "You're welcome! Is there anything else I can help you with?";
    }
    
    // Emergency - expanded keywords
    else if (userMsg.includes('emergency') || userMsg.includes('urgent') || userMsg.includes('critical') || 
             userMsg.includes('immediate') || userMsg.includes('serious') || userMsg.includes('life threatening') ||
             userMsg.includes('dire') || userMsg.includes('accident') || userMsg.includes('need help now')) {
      return "For medical emergencies, please call 911 immediately. The clinic is not equipped to handle emergency situations. For urgent but non-emergency care during clinic hours, you can come directly to the clinic.";
    }
    
    // Clear conversation - expanded keywords
    else if (userMsg.includes('clear') || userMsg.includes('reset') || userMsg.includes('start over') || 
             userMsg.includes('new conversation') || userMsg.includes('refresh') || userMsg.includes('restart')) {
      setTimeout(() => {
        chatBox.innerHTML = '';
        addMessage("Conversation has been reset. How can I help you today?", 'bot');
      }, 500);
      return "Clearing our conversation...";
    }
    
    // Context-aware responses based on conversation history
    else if (hasContextualQuestion(userMsg)) {
      return handleContextualQuestion(userMsg);
    }
    
    // Improved default response for unrecognized queries
    else {
      // Try to identify any partial matches to guide the user
      const keywords = ["appointment", "hours", "service", "medical", "dental", "vaccine", 
                        "cancel", "location", "profile", "history", "contact"];
      
      for (const keyword of keywords) {
        if (userMsg.includes(part(keyword)) || levenshteinSimilarity(userMsg, keyword) > 0.7) {
          return `I notice you might be asking about ${keyword}s. Could you please provide more details or rephrase your question?`;
        }
      }
      
      // Store the unanswered question for learning
      storeUnansweredQuestion(userMsg);
      
      // Indicate that we'll use the advanced AI
      return "I'm sorry I couldn't understand your question. Let me consult my advanced knowledge base.";
    }
  }
  
  // Function to detect if a question is complex and should be sent to AI
  function isComplexQuestion(msg) {
    // Questions with multiple parts or detailed inquiries
    if ((msg.split(' ').length > 12) && 
        (msg.includes('?') || 
         msg.includes('what') || 
         msg.includes('how') || 
         msg.includes('why') || 
         msg.includes('when') || 
         msg.includes('where'))) {
      return true;
    }
    
    // Medical terminology that might need expert knowledge
    const medicalTerms = [
      'diagnosis', 'prognosis', 'symptom', 'treatment', 'medication', 'prescription',
      'chronic', 'acute', 'condition', 'syndrome', 'disease', 'disorder',
      'tumor', 'infection', 'inflammation', 'protocol', 'therapy'
    ];
    
    // Check if message contains medical terms
    for (const term of medicalTerms) {
      if (msg.includes(term)) {
        return true;
      }
    }
    
    return false;
  }
  
  // Load marked.js for markdown parsing
  if (!window.marked) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
    document.head.appendChild(script);
  }
});