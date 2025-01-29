# LARP Nexus

LARP Nexus is a comprehensive web application designed to help LARP (Live Action Role-Playing) organizers manage their games, events, and modules efficiently. Built with modern web technologies, it provides a robust platform for scheduling and organizing LARP events.

## Features

- **Game Management**
  - Create and manage multiple LARP games
  - Customize game properties and settings
  - Assign administrators and writers
  - Support for different game systems

- **Event Scheduling**
  - Create events with date ranges
  - Visual calendar interface
  - Drag-and-drop module scheduling
  - Conflict detection and prevention

- **Module System**
  - Create detailed game modules
  - Custom module properties per game
  - Module approval workflow
  - Print-friendly module sheets

- **User Management**
  - Role-based access control
  - Writer and admin permissions
  - Custom display names per game
  - User authentication and authorization

## Technology Stack

- **Frontend**
  - React 18
  - TypeScript
  - Tailwind CSS
  - Vite
  - React Router
  - date-fns
  - Lucide React icons

- **Backend**
  - Supabase
  - PostgreSQL
  - Row Level Security (RLS)
  - Real-time subscriptions

## Getting Started

1. **Prerequisites**
   - Node.js 18+
   - npm or yarn
   - Supabase account

2. **Installation**
   ```bash
   # Clone the repository
   git clone https://github.com/yourusername/larp-nexus.git

   # Install dependencies
   cd larp-nexus
   npm install

   # Set up environment variables
   cp .env.example .env
   ```

3. **Environment Variables**
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Development**
   ```bash
   # Start development server
   npm run dev
   ```

5. **Build**
   ```bash
   # Create production build
   npm run build
   ```

## Project Structure

```
src/
├── components/     # React components
├── contexts/       # Context providers
├── lib/           # Utility functions and types
├── pages/         # Page components
└── styles/        # CSS and style files

supabase/
└── migrations/    # Database migrations
```

## Features in Detail

### Game Management
- Create games with custom properties
- Assign administrators and writers
- Configure module properties specific to each game
- Support for multiple game systems

### Event Scheduling
- Visual calendar interface
- Drag-and-drop module scheduling
- Time slot management
- Event details and descriptions

### Module System
- Custom module properties per game
- Module approval workflow (Draft → Submit → Review → Approve)
- Print-friendly module sheets
- Module status tracking

### User Management
- Role-based access control
- Custom display names per game
- Authentication via Supabase
- Admin and writer permissions

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Medieval-inspired design elements
- Tailwind CSS for styling
- Supabase for backend services
- React and Vite communities

## Support

For support, please open an issue in the GitHub repository or contact the maintainers.
