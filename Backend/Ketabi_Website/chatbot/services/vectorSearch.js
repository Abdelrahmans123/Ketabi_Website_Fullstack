import { generateEmbedding, extractPriceRange } from './embeddings.js';
import { getFromCache, saveToCache } from './cache.js';
import Book from '../../models/Book.js';
import dotenv from 'dotenv';

dotenv.config();

function getVectorIndexName() {
  const indexName = process.env.VECTOR_INDEX_NAME || 'vector_index_1';

  if (!indexName || typeof indexName !== 'string' || indexName.trim() === '') {
    throw new Error('VECTOR_INDEX_MISCONFIGURED: Invalid or missing VECTOR_INDEX_NAME');
  }

  return indexName.trim();
}

function validateBookDocument(book) {
  if (!book.name || !book.author) {
    console.warn('⚠️ Book missing required fields:', book._id);
    return false;
  }

  if (typeof book.price !== 'number' || book.price < 0) {
    console.warn(`⚠️ Book ${book._id} has invalid price:`, book.price);
    book.price = 0;
  }

  if (!book.genreName) {
    book.genreName = 'Unknown Genre';
  }

  return true;
}


async function getRandomSuggestions(limit = 3) {
  try {
    console.log('🔄 Getting random book suggestions...');

    const suggestions = await Book.aggregate([
      { $sample: { size: limit * 2 } }, 
      {
        $lookup: {
          from: 'genres',
          localField: 'genre',
          foreignField: '_id',
          as: 'genreDetails',
        },
      },
      {
        $addFields: {
          genreName: {
            $cond: {
              if: {
                $and: [
                  { $isArray: '$genreDetails' },
                  { $gt: [{ $size: '$genreDetails' }, 0] },
                ],
              },
              then: { $arrayElemAt: ['$genreDetails.name', 0] },
              else: 'Unknown Genre',
            },
          },
        },
      },
      { $project: { genreDetails: 0 } },
      { $limit: limit },
    ]);

    const validatedSuggestions = suggestions.filter((book) => validateBookDocument(book));
    console.log(`Got ${validatedSuggestions.length} random suggestions`);

    return validatedSuggestions;
  } catch (error) {
    console.error(' Error getting random suggestions:', error.message);
    return [];
  }
}

export const searchBooks = async (query, options = {}) => {
  const { limit = 3, numCandidates = 100, filter = {} } = options;

  try {
    console.log(' Query:', query);
    console.log(` Limit: ${limit} books`);

   
    const cacheKey = `${query}_${JSON.stringify(filter)}_${limit}`;
    const cachedResults = await getFromCache('search', cacheKey);
    if (cachedResults) {
      console.log(` Cache HIT: Search results retrieved from Redis`);
      return cachedResults;
    }

    const { minPrice, maxPrice } = await extractPriceRange(query);
    console.log(` Price Range: ${minPrice || 'any'} - ${maxPrice || 'any'}`);

    const queryEmbedding = await generateEmbedding(query);
    console.log(' Embedding generated');

    const vectorFilter = {};
    if (filter.bookLanguage) vectorFilter.bookLanguage = filter.bookLanguage;
    if (filter.recommendedAge) vectorFilter.recommendedAge = filter.recommendedAge;
    if (filter.status) vectorFilter.status = filter.status;

    console.log('🔍 Vector Filter:', JSON.stringify(vectorFilter, null, 2));

    const priceMatch = {};
    if (minPrice !== null && minPrice >= 0) priceMatch.$gte = minPrice;
    if (maxPrice !== null && maxPrice >= 0) priceMatch.$lte = maxPrice;

    const indexName = getVectorIndexName();

    const pipeline = [
      {
        $vectorSearch: {
          index: indexName,
          path: 'embedding',
          queryVector: queryEmbedding,
          numCandidates: numCandidates,
          limit: limit * 3,
          ...(Object.keys(vectorFilter).length > 0 && { filter: vectorFilter }),
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          author: 1,
          description: 1,
          Edition: 1,
          bookLanguage: 1,
          recommendedAge: 1,
          genre: 1,
          price: 1,
          discount: 1,
          stock: 1,
          noOfPages: 1,
          image: 1,
          avgRating: 1,
          status: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
      {
        $lookup: {
          from: 'genres',
          localField: 'genre',
          foreignField: '_id',
          as: 'genreDetails',
        },
      },
      {
        $addFields: {
          genreName: {
            $cond: {
              if: {
                $and: [
                  { $isArray: '$genreDetails' },
                  { $gt: [{ $size: '$genreDetails' }, 0] },
                ],
              },
              then: { $arrayElemAt: ['$genreDetails.name', 0] },
              else: 'Unknown Genre',
            },
          },
        },
      },
      {
        $project: {
          genreDetails: 0,
        },
      },
    ];

    if (Object.keys(priceMatch).length > 0) {
      pipeline.push({
        $match: {
          price: priceMatch,
          price: { $exists: true, $type: 'number' },
        },
      });
    }

    pipeline.push(
      { $sort: { score: -1 } },
      { $limit: limit }
    );

    console.log('🔄 Running aggregation pipeline...');
    const results = await Book.aggregate(pipeline);

    console.log(`📚 Found ${results.length} books (limit: ${limit})`);

    // تنظيف النتائج
    const validatedResults = results.filter((book) => validateBookDocument(book));

    if (validatedResults.length > 0) {
      validatedResults.forEach((book, idx) => {
        console.log(`  ${idx + 1}. "${book.name}" | ${book.author} | ${book.genreName}`);
      });
    }

   
    let finalResults = validatedResults;
    if (validatedResults.length === 0) {
      console.warn('⚠️ No results found. Getting random suggestions...');
      finalResults = await getRandomSuggestions(limit);
      finalResults.isEmptySearch = true; // إضافة flag للعلم أنها اقتراحات
    }


    await saveToCache('search', cacheKey, finalResults);
    console.log(`✅ Search results cached (${finalResults.length} books)`);

    return finalResults;

  } catch (error) {
    console.error('❌ Vector search error:', error.message);

    if (error.message.includes('VECTOR_INDEX_MISCONFIGURED')) {
      throw new Error('INDEX_CONFIG_ERROR: ' + error.message);
    }

    if (error.message.includes('QUERY_VALIDATION_FAILED')) {
      throw new Error('SEARCH_VALIDATION_ERROR: ' + error.message);
    }

    throw new Error(`SEARCH_ERROR: ${error.message}`);
  }
};
