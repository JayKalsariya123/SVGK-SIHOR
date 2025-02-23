import React, { useRef, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const ResultPage = () => {
  const { className, rollNumber } = useParams();
  const [resultData, setResultData] = useState(null);
  const [error, setError] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const resultRef = useRef(null);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const response = await fetch(`https://backendforresult.onrender.com/api/result/${className}/${rollNumber}`);
        if (!response.ok) throw new Error('Result not found');
        const data = await response.json();
        setResultData(data);
      } catch (err) {
        setError(err.message);
      }
    };
    fetchResult();
  }, [className, rollNumber]);

  const downloadResult = async () => {
    if (!resultRef.current || isGeneratingPDF) return;

    try {
      setIsGeneratingPDF(true);

      // Clone the element to modify it without affecting the display
      const elementToCapture = resultRef.current.cloneNode(true);
      document.body.appendChild(elementToCapture);
      
      // Force the clone to be visible and sized appropriately
      Object.assign(elementToCapture.style, {
        position: 'absolute',
        left: '-9999px',
        top: '-9999px',
        width: '1024px', // Fixed width for consistency
        transform: 'none',
        transition: 'none'
      });

      // Wait for any web fonts to load
      await document.fonts.ready;

      const canvas = await html2canvas(elementToCapture, {
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
        backgroundColor: '#ffffff',
        windowWidth: 1024, // Match the fixed width
        onclone: (clonedDoc) => {
          // Ensure all elements in cloned doc are visible and properly sized
          const clonedElement = clonedDoc.body.querySelector('[data-pdf-container]');
          if (clonedElement) {
            clonedElement.style.width = '1024px';
            clonedElement.style.height = 'auto';
          }
        }
      });

      // Clean up the cloned element
      document.body.removeChild(elementToCapture);

      // Calculate dimensions for A4 page
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Create PDF with proper dimensions
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // If content is longer than one page, handle multiple pages
      let heightLeft = imgHeight;
      let position = 0;
      let pageNumber = 1;

      while (heightLeft >= 0) {
        if (pageNumber > 1) {
          pdf.addPage();
        }

        pdf.addImage(
          canvas.toDataURL('image/png'),
          'PNG',
          0,
          position,
          imgWidth,
          imgHeight,
          undefined,
          'FAST'
        );

        heightLeft -= pageHeight;
        position -= pageHeight;
        pageNumber++;
      }

      pdf.save(`Result_${resultData.name}_${className}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const getSubjectName = (subject) => {
    const subjectMap = {
      'ganit': 'ગણિત',
      'samanya_gyan': 'સામાન્ય જ્ઞાન',
      'bhasha': 'ભાષા',
      'angreji': 'અંગ્રેજી',
      'hindi': 'હિન્દી',
      'kalshor': 'કલાશોર',
      'aaspas': 'આસપાસ',
      'kuhu': 'કુહુ',
      'kekarav': 'કેકરાવ',
      'palash': 'પલાશ',
      'vigyan': 'વિજ્ઞાન',
      'sanskrit': 'સંસ્કૃત',
      'samaj': 'સમાજશાસ્ત્ર',
      'gujarati': 'ગુજરાતી'
    };
    return subjectMap[subject] || subject;
  };

  const calculateTotalMarks = (subjects) => {
    return Object.values(subjects).reduce((a, b) => parseInt(a) + parseInt(b), 0);
  };

  const calculatePercentage = (totalMarks, maxMarks) => {
    return ((totalMarks / parseInt(maxMarks)) * 100).toFixed(2);
  };

  if (error) return <div className="text-center text-red-600 p-4">{error}</div>;
  if (!resultData) return <div className="text-center p-4">Loading...</div>;

  const subjects = Object.keys(resultData.rounds[0].subjects);
  const standard = className.toUpperCase();

  // Calculate overall results
  const totalObtainedMarks = resultData.rounds.reduce((acc, round) => 
    acc + calculateTotalMarks(round.subjects), 0);
  const totalMaxMarks = parseInt(resultData.maxMarksInRound) * resultData.rounds.length;
  const overallPercentage = calculatePercentage(totalObtainedMarks, totalMaxMarks);

  return (
    <div className="p-4">
      <div ref={resultRef} data-pdf-container className="max-w-4xl mx-auto bg-white p-8">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold mb-2">સંસ્કૃતિ સ્કૂલ, વિદ્યામંજરી જ્ઞાનપીઠ કેમ્પસ - સિહોર</h1>
          <h2 className="text-lg mb-2">{resultData.TestName}</h2>
          <div className="mb-2">
            <span className="font-semibold">વિદ્યાર્થીનું નામ: </span>
            {resultData.name}
          </div>
          <div>
            <span className="font-semibold">ધોરણ: </span>
            {standard} | <span className="font-semibold">વર્ગ રેન્ક: </span>
            {resultData.classRank}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border">
            <thead>
              <tr>
                <th className="border p-2">વિષય</th>
                {subjects.map(subject => (
                  <th key={subject} className="border p-2">
                    {getSubjectName(subject)}
                  </th>
                ))}
                <th className="border p-2">કુલ ગુણ</th>
                <th className="border p-2">મેળવેલ ગુણ</th>
                <th className="border p-2">ટકા</th>
                <th className="border p-2">રાઉન્ડ રેન્ક</th>
              </tr>
            </thead>
            <tbody>
              {resultData.rounds.map((round, index) => {
                const totalMarks = calculateTotalMarks(round.subjects);
                const percentage = calculatePercentage(totalMarks, resultData.maxMarksInRound);
                
                return (
                  <tr key={index}>
                    <td className="border p-2">Round-{round.roundNumber}</td>
                    {subjects.map(subject => (
                      <td key={subject} className="border p-2 text-center">
                        {parseInt(round.subjects[subject])}
                      </td>
                    ))}
                    <td className="border p-2 text-center">{resultData.maxMarksInRound}</td>
                    <td className="border p-2 text-center">{totalMarks}</td>
                    <td className="border p-2 text-center">{percentage}%</td>
                    <td className="border p-2 text-center">{round.rank}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-center">
          <div>
            <span className="font-semibold">મેળવેલ ગુણ: </span>
            {totalObtainedMarks} | 
            <span className="font-semibold"> ટકાવારી: </span>
            {overallPercentage}% | 
            <span className="font-semibold"> ધોરણ રેન્ક: </span>
            {resultData.standardRank}
          </div>
        </div>
      </div>

      <div className="mt-4 text-center">
        <button 
          onClick={downloadResult} 
          disabled={isGeneratingPDF}
          className={`px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 ${
            isGeneratingPDF ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isGeneratingPDF ? 'Generating PDF...' : 'Download Result as PDF'}
        </button>
      </div>
    </div>
  );
};

export default ResultPage;
