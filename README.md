# Expenses Application - made with Lovable & Claude Code

An expenses claim web app built with Lovable and Claude Code, published as the open demo repository for [Quality Clouds Hub](https://portal.qualityclouds.ai).

AI built this app. We scanned it with our own product. The results are below, unedited.

## The score

**Production-Ready Score: 81/100** (scanned 13 July 2026)

| Area | Score | Issues |
|---|---|---|
| Security | 91% | 7 (5 high) |
| Manageability | 89% | 1 (1 high) |
| Scalability | 81% | 35 (28 high) |
| Maintainability | 80% | 4 (1 high) |
| Performance | 59%, fail | 16 (7 high) |
<img width="1568" height="564" alt="Production-Ready Score dashboard showing 81/100" src="https://github.com/user-attachments/assets/d3979856-a7fd-413e-b14a-a6e1e5c07f58" />

63 findings across 73 rules and 5 rulesets, activated automatically against the detected stack. The score is diagnostic: it tells you what needs attention before this code reaches production, it doesn't block anything.

The headline: an app that looks finished and runs fine in a preview still failed Performance outright, and 41 of the 63 findings are high severity. That gap between "it works" and "it's production ready" is the reason Quality Clouds Hub exists.

## Why this repo is public

Most demo projects show a product at its best. This one shows real AI-generated code with real problems, because that's what you're shipping if nobody checks.

Everything here is exactly as the AI tools produced it: Lovable generated the app, Claude Code added the minimum wiring to run it. No human cleanup before the scan.

## Try it yourself

Every new Quality Clouds Hub workspace includes this project's scan results, so you can explore the findings without touching any code. To fix issues and re-scan:

1. **Fork this repo.**
2. **Sign up at [portal.qualityclouds.ai](https://portal.qualityclouds.ai)** if you haven't already. The free tier is permanent: 1 certificate a month, no credit card.
3. **Connect your fork** and run a scan.
4. **Open the Performance issues first.** Each finding comes with a paste-ready fix for your IDE.
5. **Fix, re-scan, and watch the score move.** Get it over the bar and earn your certificate.

## Stack

Lovable's default output: React, TypeScript, Vite and Tailwind. Quality Clouds Hub detected the stack and picked the rulesets automatically; the same works for any stack, whichever tool or model wrote the code.

## About Quality Clouds Hub

Quality Clouds Hub scores AI-generated code across six areas (Security, Performance, Maintainability, Scalability, Manageability, Architecture) and gives you the fixes, built on 9 years of governance data from 950+ enterprise platform instances.

Start free at [portal.qualityclouds.ai](https://portal.qualityclouds.ai).
