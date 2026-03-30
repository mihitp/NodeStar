# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

This is a new, empty Node.js project (`node-star`). No source files, package.json, or build configuration exist yet.




## Agent Orchestration Practices

The main orchestrator should be a Claude Opus with 1M context, the sub agents can be regular Claude sonnet models. 

Make sure each sub agent has an outcome-driven plan. Not to just endlessly build, but build to achieve an outcome set by you - the main orchestrator.

Make sure they sub agents talk to you, and you are aware of the progress. if strictly necessary, you can allow them to talk to each other. Once no longer needed, you can delete the history of old sub agent communications with you to save context.

You can use the TDD agent, but dont over use it. otherwise it will take too long to build basic features. use the skills, agents, and MCP servers available for ease.  You can run a mild version of TDD when each phase is done




## First Build Instructions

THe instructions for the development of this prototype are in the build.md file. You can refer to this at any point, try not to store the entire build.md in context so you dont run out. 

For each phase, make a github branch, once done, you can commit the changes. ill go over them and merge it. maintain neat, standard github practices. only orchestrator has the privelege to make github commits - sub agents do not. 

## Context Management Practices

you can compact / get rid of chat history after each phase. just pass on context to what the sub agents need,not more, not less.
