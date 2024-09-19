from flask import Flask, request, jsonify
from flask_cors import CORS
from sentence_transformers import SentenceTransformer, util

app = Flask(__name__)
CORS(app) 
''
# Load the model
model = SentenceTransformer('sentence-transformers/msmarco-distilbert-base-tas-b')

@app.route('/query', methods=['POST'])
def query_documents():
    # Get data from the request
    data = request.get_json()
    query = data['query']
    docs = data['documents']
    topk = data.get('topk', 3)  # Default topk is 3 if not provided

    # Check if there are at least 3 documents for comparison
    if len(docs) < 3:
        return jsonify({"error": "Minimum 3 sentences required for comparison"}), 400

    # Encode query and documents
    query_emb = model.encode(query)
    doc_emb = model.encode(docs)

    # Compute dot score between query and all document embeddings
    scores = util.dot_score(query_emb, doc_emb)[0].cpu().tolist()

    # Combine docs & scores
    doc_score_pairs = list(zip(docs, scores))

    # Sort by decreasing score
    doc_score_pairs = sorted(doc_score_pairs, key=lambda x: x[1], reverse=True)

    # Output top k passages & scores
    top_results = [{"text": doc, "score": score} for doc, score in doc_score_pairs[:topk]]

    return jsonify(top_results)

if __name__ == '__main__':
    app.run(debug=True)
