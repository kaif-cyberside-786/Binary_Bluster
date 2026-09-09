"""
Duplicate & Historical Repeat Detection Service (AI-02)
Uses in-process TF-IDF vectorization and cosine similarity over project titles, descriptions,
and location tokens. No external vector DB or Atlas Vector Search per architecture ADR 26.3.
Advisory only — never declares fraud or enforces hard blocks per rules.md §12.
"""
from typing import List, Dict, Any
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from app.schemas import DuplicateCheckRequest, DuplicateCandidate, SignalResponse


def _build_text_corpus_item(p: DuplicateCandidate) -> str:
    tokens = [
        p.title or "",
        p.description or "",
        p.location or "",
        p.ward or "",
        p.block or "",
        p.category or "",
    ]
    return " ".join([t for t in tokens if t]).strip()


def analyze_duplicates(req: DuplicateCheckRequest) -> SignalResponse:
    target = req.target_project
    candidates = req.candidate_projects

    if not candidates:
        return SignalResponse(
            signal_type="DUPLICATE_OVERLAP",
            severity="LOW",
            score=0,
            status="OK",
            message="No historical candidate projects available in jurisdiction for duplicate comparison.",
            evidence={
                "matches": [],
                "target_project_id": target.project_id,
                "candidate_count": 0,
            },
            model_or_rule="TFIDF_COSINE_V1",
        )

    target_text = _build_text_corpus_item(target)
    if not target_text:
        target_text = target.title or target.project_id

    corpus = [target_text] + [_build_text_corpus_item(c) for c in candidates]

    try:
        vectorizer = TfidfVectorizer(
            lowercase=True,
            stop_words="english",
            ngram_range=(1, 2),
            max_features=5000,
        )
        tfidf_matrix = vectorizer.fit_transform(corpus)
        # Compute cosine similarity between target (index 0) and all candidates (indices 1..)
        similarities = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:])[0]
    except Exception:
        # Fallback if vocabulary empty (e.g. very short tokens)
        similarities = [0.0] * len(candidates)

    matches: List[Dict[str, Any]] = []

    for i, candidate in enumerate(candidates):
        raw_sim = float(similarities[i])

        # Metadata boosters for geographical and category overlap
        geo_boost = 0.0
        if target.category and candidate.category and target.category.upper() == candidate.category.upper():
            geo_boost += 0.05

        if target.ward and candidate.ward and target.ward.lower() == candidate.ward.lower():
            geo_boost += 0.10
        elif target.location and candidate.location and target.location.lower() in candidate.location.lower():
            geo_boost += 0.05

        final_similarity = min(1.0, round(raw_sim + geo_boost, 3))

        if final_similarity >= (req.similarity_threshold or 0.30):
            matches.append({
                "project_id": candidate.project_id,
                "title": candidate.title,
                "category": candidate.category,
                "district": candidate.district,
                "location": candidate.location or candidate.ward or "Same Area",
                "status": candidate.status,
                "sanctioned_cost": candidate.sanctioned_cost,
                "similarity_score": round(final_similarity * 100, 1),
                "raw_cosine_similarity": round(raw_sim, 3),
            })

    # Sort matches by similarity score descending
    matches.sort(key=lambda m: m["similarity_score"], reverse=True)

    if matches:
        top_match = matches[0]
        top_score_pct = top_match["similarity_score"]

        if top_score_pct >= 70.0:
            severity = "HIGH"
            score = min(95, max(75, int(top_score_pct)))
            message = (
                f"Possible repeated or overlapping work detected with historical project "
                f"{top_match['project_id']} ('{top_match['title']}', {top_score_pct:.1f}% match). "
                f"Physical review recommended."
            )
        elif top_score_pct >= 45.0:
            severity = "MEDIUM"
            score = min(74, max(40, int(top_score_pct)))
            message = (
                f"Potential topical or geographical overlap with {top_match['project_id']} "
                f"({top_score_pct:.1f}% similarity). Field verification recommended."
            )
        else:
            severity = "LOW"
            score = int(top_score_pct * 0.5)
            message = (
                f"Minor topical similarity ({top_score_pct:.1f}%) detected with {top_match['project_id']}; "
                f"within acceptable unique parameters."
            )
    else:
        severity = "LOW"
        score = 0
        message = "No significant historical duplicate or overlapping works detected in jurisdiction."

    return SignalResponse(
        signal_type="DUPLICATE_OVERLAP",
        severity=severity,
        score=score,
        status="OK",
        message=message,
        evidence={
            "target_project_id": target.project_id,
            "candidate_count": len(candidates),
            "matches_found": len(matches),
            "top_matches": matches[:5],  # Return up to 5 highest candidates
        },
        model_or_rule="TFIDF_COSINE_V1",
    )

