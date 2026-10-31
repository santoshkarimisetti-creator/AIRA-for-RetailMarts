"""
AIRA - AI Store Assistant Module
Redirects to Database-Grounded Rule-Based Retail Assistant Engine.
"""

from app.ai.rule_based_assistant import rule_assistant

# Backward compatibility alias
gemini_assistant = rule_assistant
