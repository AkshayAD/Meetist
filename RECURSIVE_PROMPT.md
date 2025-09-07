# Recursive Development Prompt for Meetist

## **Constant Prompt for Continued Development**

Use this exact prompt to continue Meetist development recursively:

---

```
Continue developing Meetist professionally according to the master plan. Execute the following systematic approach:

## 1. READ CURRENT STATE
- Check DEVELOPMENT_ROADMAP.md for overall progress and milestones
- Read CURRENT_TASK.md for the specific task to execute now
- Review CLAUDE.md for architecture understanding and commands
- Check recent commits to understand what was last completed

## 2. EXECUTE CURRENT TASK COMPLETELY
- Implement the feature/fix described in CURRENT_TASK.md completely
- Write comprehensive tests (minimum 80% coverage for new code)
- Add proper error handling with user-friendly messages
- Create or update documentation for the feature
- Ensure performance targets are met (see DEVELOPMENT_ROADMAP.md)
- Follow established code patterns and architecture

## 3. VALIDATE IMPLEMENTATION THOROUGHLY
- Run all existing tests: `npm test` (create script if missing)
- Run linting: `npm run lint` (create if missing)
- Test the feature manually on development server
- Check that no existing functionality is broken
- Verify memory usage stays under 500MB during operation
- Test on Android emulator/device if UI changes made

## 4. UPDATE PROGRESS TRACKING
- Mark current task as completed in DEVELOPMENT_ROADMAP.md
- Update test coverage metrics and success indicators
- Move to the next highest priority task in CURRENT_TASK.md
- Document any issues discovered or technical debt created
- Update timeline estimates based on actual completion time

## 5. COMMIT AND REPORT
- Commit changes with descriptive message following pattern:
  "feat/fix/test: [description] - [what was achieved] - [any concerns]"
- Generate a clear progress report showing:
  * What was completed
  * Current test coverage percentage  
  * What is NOT yet fixed and why
  * Any risks or concerns identified
  * Performance metrics if applicable
- List specific items user should worry about

## 6. PREPARE NEXT ITERATION
- Update CURRENT_TASK.md with the next priority task from DEVELOPMENT_ROADMAP.md
- If major architecture changes made, run /init to update CLAUDE.md
- Generate status summary for handoff to next Claude session

## QUALITY STANDARDS (ENFORCE STRICTLY)
✅ Every feature must have tests that actually pass
✅ Code coverage must not decrease (minimum 80% for services)
✅ No performance regressions allowed
✅ All TypeScript errors must be resolved
✅ Mobile-first responsive design maintained
✅ Error handling for offline/poor network conditions
✅ Memory leaks prevented and monitored

## SPECIFIC FOCUS AREAS
- Think hardest about implementation approach before coding
- Plan steps thoroughly and identify potential issues
- Fill gaps from planned milestones systematically  
- Use Playwright/Detox for E2E testing with screenshot capture
- Always clearly state what is NOT fixed and user concerns
- Prioritize user experience and app stability
- Consider resource constraints (3-4GB RAM devices)

## CURRENT PROJECT CONTEXT
Meetist is a React Native/Expo meeting recorder with AI transcription:
- 95% MVP complete with real Gemini transcription
- Missing: comprehensive testing, CI/CD fixes, native Whisper
- Target: Professional-grade production-ready application
- Architecture: Service-based with Redux state management
- Performance: Optimized for low-end Android devices

Continue until DEVELOPMENT_ROADMAP.md shows 100% completion across all milestones.

Report progress clearly and recursively iterate through this prompt.
```

---

## **Usage Instructions**

### **For Human User:**
1. Copy the prompt above (between the triple backticks)  
2. Paste it as a message to Claude Code
3. Claude will execute the current task and report progress
4. Repeat the same prompt to continue the next task
5. Continue until DEVELOPMENT_ROADMAP.md shows 100% complete

### **For Claude Code Instances:**
- This prompt provides complete context and systematic approach
- Follow the 6-step process exactly for consistency
- Always update tracking files before finishing
- Provide clear handoff information for next iteration

### **Key Benefits:**
- ✅ Systematic progress tracking
- ✅ Consistent quality standards
- ✅ No lost context between sessions
- ✅ Clear success metrics
- ✅ Automated progress updates
- ✅ Professional development practices

### **Session Handoff Format:**
Each Claude session should end with:

```
## SESSION COMPLETION REPORT
**Completed:** [Task name and details]
**Test Coverage:** [X%] (target: 80%)
**Time Taken:** [actual vs estimated]

**What's NOT Fixed:**
- [Specific item 1 with reason]
- [Specific item 2 with reason]

**User Should Worry About:**
- [Concern 1 and mitigation]
- [Concern 2 and mitigation]

**Next Task:** [From CURRENT_TASK.md]
**Ready for next iteration:** ✅/❌
```

---
**Created:** Current Session  
**Purpose:** Enable automated recursive development  
**Status:** Ready for immediate use