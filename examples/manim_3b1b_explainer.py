"""
3b1b / Manim Style Explainer Video Example for ASD-STE100
Demonstrating Andrej Karpathy's recommendation for bespoke visual explainers.

To render:
    manim -pql manim_3b1b_explainer.py STEConceptExplainer
"""

from manim import *

class STEConceptExplainer(Scene):
    def construct(self):
        # Narration Marker (ElevenLabs TTS):
        # "Human working memory is limited. Verbose technical English overwhelms the brain."
        title = Text("Why ASD-STE100?", font_size=42, color=BLUE)
        self.play(Write(title))
        self.wait(1)
        self.play(title.animate.to_edge(UP))

        # Verbose Box
        bad_box = Rectangle(width=6, height=2.2, color=RED)
        bad_title = Text("Uncontrolled English", font_size=20, color=RED).next_to(bad_box, UP, buff=0.1)
        bad_text = Paragraph(
            "• Long sentences (>40 words)\n• Passive voice constructions\n• Synonyms cause confusion\n• High cognitive overhead",
            font_size=16,
            line_spacing=0.8
        ).move_to(bad_box.get_center())
        left_group = VGroup(bad_box, bad_title, bad_text).shift(LEFT * 3.3 + DOWN * 0.5)

        # STE Box
        good_box = Rectangle(width=6, height=2.2, color=GREEN)
        good_title = Text("ASD-STE100 (Karpathy 80%)", font_size=20, color=GREEN).next_to(good_box, UP, buff=0.1)
        good_text = Paragraph(
            "• Short sentences (<=25 words)\n• Active voice only\n• One word, one meaning\n• Instant mental parsing",
            font_size=16,
            line_spacing=0.8
        ).move_to(good_box.get_center())
        right_group = VGroup(good_box, good_title, good_text).shift(RIGHT * 3.3 + DOWN * 0.5)

        # Narration Marker (ElevenLabs TTS):
        # "Comparing conventional writing with Simplified Technical English."
        self.play(FadeIn(left_group))
        self.wait(1.5)
        self.play(FadeIn(right_group))
        self.wait(2)

        # Focus on Core Metric
        arrow = Arrow(start=left_group.get_right(), end=right_group.get_left(), color=YELLOW)
        transform_label = Text("4x Faster Comprehension", font_size=18, color=YELLOW).next_to(arrow, UP)
        self.play(GrowArrow(arrow), Write(transform_label))
        self.wait(3)

        self.play(FadeOut(left_group), FadeOut(right_group), FadeOut(arrow), FadeOut(transform_label), FadeOut(title))
