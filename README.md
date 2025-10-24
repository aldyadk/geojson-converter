# GeoJSON Maker

A web application that converts station data with polygon coordinates to GeoJSON format. Perfect for mapping applications and GIS tools.

## Features

- Convert JSON data with polygon coordinates to GeoJSON format
- Clean, modern web interface
- Download converted GeoJSON files
- Example data included for testing
- Optimized for Vercel deployment

## Input Format

The application expects JSON data in the following format:

```json
[
  {
    "id": 1088,
    "area_name": "LRT Indonesia",
    "area_list": [
      {
        "id": 9344,
        "id_landmark": 0,
        "name": "Stasiun LRT Ciliwung",
        "address": "",
        "type": "",
        "polygon": "[{\"lat\":-6.242799927901021,\"long\":106.86279925611093},{\"lat\":-6.243423842559002,\"long\":106.86278852727487}]",
        "created_at": "2025-03-12T07:48:42Z",
        "updated_at": "2025-03-12T07:48:42Z",
        "is_active": false
      }
    ],
    "created_at": "2023-08-08T11:39:54Z",
    "updated_at": "2025-03-12T07:48:42Z",
    "is_active": true,
    "is_deleted": false
  }
]
```

## Output Format

The application outputs standard GeoJSON format:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "id": 9344,
        "name": "Stasiun LRT Ciliwung",
        "area_name": "LRT Indonesia",
        "area_id": 1088,
        "is_active": false
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[106.86279925611093, -6.242799927901021], [106.86278852727487, -6.243423842559002]]]
      }
    }
  ]
}
```

## Development

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
npm install
```

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Build for Production

```bash
npm run build
npm start
```

## Deployment on Vercel

1. Push your code to a Git repository
2. Connect your repository to Vercel
3. Deploy automatically

The application is already configured for Vercel deployment with:
- `vercel.json` configuration
- Next.js App Router
- Standalone output mode

## API Endpoint

The application provides a REST API endpoint:

**POST** `/api/convert`

- **Body**: JSON array of area data
- **Response**: GeoJSON FeatureCollection
- **Content-Type**: `application/json`

## Technologies Used

- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Vercel (deployment)

## License

MIT License
