# CLAUDE.md - Excellence Standards for Virgil

## Mission
Build **legendary code** - production-ready, performant, and beautiful. Every line should be clean, optimized, and bulletproof. Other developers should want to reference this codebase.

## Project: Virgil
React/TypeScript app with physics raccoon, weather, location, LLM chat.
**Context**: Ben is learning - explain clearly while maintaining exceptional standards.

## Tech Stack
- **Frontend**: React 19.1, TypeScript 5.8, Vite 7.0, PWA
- **Backend**: Express 5.1 (port 5002), Supabase
- **Testing**: Jest, React Testing Library (80%+ coverage)

## Code Excellence Standards

### Core Principles
- **Clean**: Readable like prose, self-documenting
- **Simple**: Simplest solution that works perfectly
- **DRY**: Zero duplication, extract common logic
- **Robust**: Handle ALL edge cases gracefully
- **Performant**: Measure first, optimize with data

### Quality Checklist
Before code is complete:
✓ Works perfectly in all scenarios
✓ Cleanest possible implementation
✓ Other devs understand instantly
✓ Performance optimized with metrics
✓ Fully tested (aim for 95% coverage)
✓ Follows all project patterns

### Time & Date Handling
- **Always use TimeService**: Never use `new Date()` directly in components
- **Import**: `import { dashboardContextService } from '../services/DashboardContextService'`
- **Common methods**: `getLocalDate()`, `getCurrentDateTime()`, `formatDateToLocal()`
- **Reference**: See `src/services/TimeService.md` for complete guide

### Development Process
1. **Plan**: Understand fully, design clean architecture
2. **Code**: Small functions (<20 lines), descriptive names, handle errors
3. **Test**: Continuously, not at the end
4. **Optimize**: Profile and measure, no guessing

## Commands
- `npm run dev-full`: Start both servers
- `npm test`: Run all tests  
- `npm run lint`: Enforce standards
- `npm run type-check`: TypeScript validation
- `npm run build`: Production build

## Project Structure
```
src/              # React frontend
├── components/   # Reusable, tested UI
├── hooks/        # Performance-optimized
├── contexts/     # Efficient state
├── services/     # Clean API integration
└── types/        # Complete TypeScript types

server/           # Express backend
├── routes/       # RESTful, validated
├── middleware/   # Security-first
└── services/     # Abstracted logic
```

## Performance Targets
- Load time: <3s on 3G
- Bundle: <200KB initial
- API: <200ms response
- Animations: 60fps
- Lighthouse: >95

## Communication
- Explain decisions clearly
- Share performance data
- Highlight patterns used
- Make Ben proud of the code
- Explain technical terms to help Ben read code

## Never Do This
❌ Untested code
❌ Performance without measurement
❌ Copy-paste programming
❌ Ignore TypeScript errors
❌ Quick fixes over quality
❌ TODOs in production
❌ Direct `new Date()` usage - use TimeService

## The Standard
Write code that's:
- **Beautiful**: Others admire it
- **Bulletproof**: Never breaks
- **Fast**: Optimized properly
- **Maintainable**: Joy to work with

Every commit should improve the codebase. Build something legendary that showcases best practices.

**Remember**: Quality is non-negotiable. This is Ben's vital project - help him succeed with exceptional code.